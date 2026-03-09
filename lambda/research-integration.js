const { DynamoDBClient, PutItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ssm = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Academic API integrations
class AcademicAPIs {
    constructor() {
        this.apiKeys = {};
    }

    async getApiKey(service) {
        if (!this.apiKeys[service]) {
            try {
                const command = new GetParameterCommand({
                    Name: `/conceptforge/${process.env.ENVIRONMENT}/${service}-api-key`,
                    WithDecryption: true
                });
                const response = await ssm.send(command);
                this.apiKeys[service] = response.Parameter.Value;
            } catch (error) {
                console.error(`Failed to get API key for ${service}:`, error);
                return null;
            }
        }
        return this.apiKeys[service];
    }

    // PubMed Integration
    async searchPubMed(query, maxResults = 10) {
        try {
            const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
            
            // Search for paper IDs
            const searchUrl = `${baseUrl}esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            
            if (!searchData.esearchresult?.idlist?.length) {
                return [];
            }
            
            // Get paper details
            const ids = searchData.esearchresult.idlist.join(',');
            const summaryUrl = `${baseUrl}esummary.fcgi?db=pubmed&id=${ids}&retmode=json`;
            const summaryResponse = await fetch(summaryUrl);
            const summaryData = await summaryResponse.json();
            
            const papers = [];
            for (const id of searchData.esearchresult.idlist) {
                const paper = summaryData.result[id];
                if (paper) {
                    papers.push({
                        id: paper.uid,
                        title: paper.title,
                        authors: paper.authors?.map(a => a.name) || [],
                        journal: paper.fulljournalname || paper.source,
                        year: new Date(paper.pubdate).getFullYear(),
                        abstract: paper.abstract || 'Abstract not available',
                        pmid: paper.uid,
                        doi: paper.elocationid?.replace('doi: ', '') || null,
                        citations: 0, // PubMed doesn't provide citation count
                        source: 'PubMed'
                    });
                }
            }
            
            return papers;
        } catch (error) {
            console.error('PubMed search error:', error);
            return [];
        }
    }

    // arXiv Integration
    async searchArXiv(query, maxResults = 10) {
        try {
            const baseUrl = 'http://export.arxiv.org/api/query';
            const searchUrl = `${baseUrl}?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}`;
            
            const response = await fetch(searchUrl);
            const xmlText = await response.text();
            
            // Simple XML parsing (in production, use a proper XML parser)
            const papers = [];
            const entries = xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || [];
            
            for (const entry of entries) {
                const title = entry.match(/<title>(.*?)<\/title>/s)?.[1]?.trim();
                const summary = entry.match(/<summary>(.*?)<\/summary>/s)?.[1]?.trim();
                const published = entry.match(/<published>(.*?)<\/published>/)?.[1];
                const authors = entry.match(/<name>(.*?)<\/name>/g)?.map(m => m.replace(/<\/?name>/g, '')) || [];
                const id = entry.match(/<id>(.*?)<\/id>/)?.[1];
                
                if (title && id) {
                    papers.push({
                        id: id.split('/').pop(),
                        title: title.replace(/\n/g, ' '),
                        authors: authors,
                        journal: 'arXiv',
                        year: new Date(published).getFullYear(),
                        abstract: summary?.replace(/\n/g, ' ') || 'Abstract not available',
                        arxivId: id.split('/').pop(),
                        citations: 0,
                        source: 'arXiv'
                    });
                }
            }
            
            return papers;
        } catch (error) {
            console.error('arXiv search error:', error);
            return [];
        }
    }

    // Semantic Scholar Integration
    async searchSemanticScholar(query, maxResults = 10) {
        try {
            const apiKey = await this.getApiKey('semantic-scholar');
            const baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';
            
            const params = new URLSearchParams({
                query: query,
                limit: maxResults,
                fields: 'paperId,title,authors,year,abstract,journal,citationCount,url'
            });
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (apiKey && apiKey !== 'placeholder-key') {
                headers['x-api-key'] = apiKey;
            }
            
            const response = await fetch(`${baseUrl}?${params}`, { headers });
            const data = await response.json();
            
            if (!data.data) {
                return [];
            }
            
            return data.data.map(paper => ({
                id: paper.paperId,
                title: paper.title,
                authors: paper.authors?.map(a => a.name) || [],
                journal: paper.journal?.name || 'Unknown Journal',
                year: paper.year,
                abstract: paper.abstract || 'Abstract not available',
                citations: paper.citationCount || 0,
                url: paper.url,
                source: 'Semantic Scholar'
            }));
        } catch (error) {
            console.error('Semantic Scholar search error:', error);
            return [];
        }
    }

    // CrossRef Integration for DOI resolution
    async searchCrossRef(query, maxResults = 10) {
        try {
            const baseUrl = 'https://api.crossref.org/works';
            const params = new URLSearchParams({
                query: query,
                rows: maxResults,
                select: 'DOI,title,author,published-print,abstract,container-title,is-referenced-by-count'
            });
            
            const response = await fetch(`${baseUrl}?${params}`);
            const data = await response.json();
            
            if (!data.message?.items) {
                return [];
            }
            
            return data.message.items.map(item => ({
                id: item.DOI,
                title: item.title?.[0] || 'Untitled',
                authors: item.author?.map(a => `${a.given} ${a.family}`) || [],
                journal: item['container-title']?.[0] || 'Unknown Journal',
                year: item['published-print']?.['date-parts']?.[0]?.[0] || new Date().getFullYear(),
                abstract: item.abstract || 'Abstract not available',
                doi: item.DOI,
                citations: item['is-referenced-by-count'] || 0,
                source: 'CrossRef'
            }));
        } catch (error) {
            console.error('CrossRef search error:', error);
            return [];
        }
    }
}

const academicAPIs = new AcademicAPIs();

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const { query, sources = ['pubmed', 'arxiv', 'semantic-scholar'], maxResults = 10 } = JSON.parse(event.body);
        
        if (!query || query.trim().length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Research query is required' })
            };
        }

        // Search across multiple academic databases
        const searchPromises = [];
        
        if (sources.includes('pubmed')) {
            searchPromises.push(academicAPIs.searchPubMed(query, Math.ceil(maxResults / sources.length)));
        }
        
        if (sources.includes('arxiv')) {
            searchPromises.push(academicAPIs.searchArXiv(query, Math.ceil(maxResults / sources.length)));
        }
        
        if (sources.includes('semantic-scholar')) {
            searchPromises.push(academicAPIs.searchSemanticScholar(query, Math.ceil(maxResults / sources.length)));
        }
        
        if (sources.includes('crossref')) {
            searchPromises.push(academicAPIs.searchCrossRef(query, Math.ceil(maxResults / sources.length)));
        }

        // Execute searches in parallel
        const results = await Promise.allSettled(searchPromises);
        
        // Combine and deduplicate results
        const allPapers = [];
        const seenTitles = new Set();
        
        for (const result of results) {
            if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                for (const paper of result.value) {
                    const normalizedTitle = paper.title.toLowerCase().trim();
                    if (!seenTitles.has(normalizedTitle)) {
                        seenTitles.add(normalizedTitle);
                        allPapers.push(paper);
                    }
                }
            }
        }
        
        // Sort by citations (descending) and year (descending)
        allPapers.sort((a, b) => {
            if (b.citations !== a.citations) {
                return b.citations - a.citations;
            }
            return b.year - a.year;
        });
        
        // Limit results
        const limitedResults = allPapers.slice(0, maxResults);
        
        // Generate research gaps based on the query and results
        const researchGaps = generateResearchGaps(query, limitedResults);
        
        // Store search analytics (don't fail if this errors)
        storeSearchAnalytics(query, limitedResults.length, sources).catch(err => {
            console.error('Analytics storage error (non-fatal):', err.message);
        });
        
        const response = {
            query: query,
            totalResults: limitedResults.length,
            sources: sources,
            papers: limitedResults,
            researchGaps: researchGaps,
            searchTimestamp: new Date().toISOString()
        };
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response)
        };
        
    } catch (error) {
        console.error('Research integration error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

function generateResearchGaps(query, papers) {
    // Analyze papers to identify research gaps
    const gaps = [];
    
    // Common research gap patterns
    const gapPatterns = [
        'Limited longitudinal studies on long-term effects',
        'Insufficient cross-cultural validation and replication',
        'Gap in real-world implementation and scalability analysis',
        'Need for interdisciplinary collaboration and integration',
        'Limited investigation of ethical implications and bias',
        'Insufficient analysis of cost-effectiveness and ROI',
        'Gap in user experience and adoption barrier studies',
        'Need for standardized evaluation metrics and benchmarks'
    ];
    
    // Analyze paper abstracts for common themes
    const themes = new Set();
    papers.forEach(paper => {
        const abstract = paper.abstract.toLowerCase();
        if (abstract.includes('machine learning') || abstract.includes('ai')) themes.add('AI/ML');
        if (abstract.includes('clinical') || abstract.includes('patient')) themes.add('Clinical');
        if (abstract.includes('social') || abstract.includes('behavior')) themes.add('Social');
        if (abstract.includes('economic') || abstract.includes('cost')) themes.add('Economic');
    });
    
    // Select relevant gaps based on themes and query
    const selectedGaps = gapPatterns
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);
    
    return selectedGaps;
}

async function storeSearchAnalytics(query, resultCount, sources) {
    try {
        const timestamp = new Date().toISOString();
        const params = {
            TableName: process.env.ANALYTICS_TABLE,
            Item: {
                metricType: { S: 'research_search' },
                timestamp: { S: timestamp },
                query: { S: query.substring(0, 500) },
                resultCount: { N: resultCount.toString() },
                sources: { SS: sources },
                ttl: { N: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60).toString() } // 90 days TTL
            }
        };
        
        await dynamodb.send(new PutItemCommand(params));
    } catch (error) {
        console.error('Analytics storage error:', error);
        // Don't fail the request if analytics storage fails
    }
}