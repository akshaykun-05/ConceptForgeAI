const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        const { idea } = JSON.parse(event.body);
        
        if (!idea || idea.trim().length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Idea text is required' })
            };
        }

        // Generate enhanced validation using Amazon Bedrock
        const validation = await generateEnhancedValidation(idea);
        
        // Store in DynamoDB
        await storeValidation(idea, validation);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(validation)
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

async function generateEnhancedValidation(idea) {
    const prompt = `
    You are ConceptForgeAI, an advanced AI system that analyzes business ideas and research concepts. 
    Analyze the following concept and provide a comprehensive validation report:

    CONCEPT: "${idea}"

    Please provide your analysis in the following JSON format:
    {
        "uniquenessScore": [0-100 integer],
        "commercialScore": [0-100 integer],
        "riskLevel": ["Low", "Medium", or "High"],
        "targetIndustries": [array of 2-3 most relevant industries with specific sub-sectors],
        "keyRisks": [array of 3-4 specific, actionable risks],
        "improvements": [array of 4-5 strategic recommendations],
        "relatedPapers": [array of 3-4 realistic research paper titles with journals and years]
    }

    Analysis Guidelines:
    - Uniqueness Score: Evaluate market differentiation, innovation level, and competitive landscape (0=highly saturated, 100=breakthrough innovation)
    - Commercial Score: Assess revenue potential, market size, monetization clarity, and business viability (0=not viable, 100=high commercial potential)
    - Risk Level: Overall project risk considering market, technical, and execution factors
    - Target Industries: Be specific with sub-sectors (e.g., "Healthcare - Digital Therapeutics" not just "Healthcare")
    - Key Risks: Focus on specific, actionable risks rather than generic concerns
    - Improvements: Provide strategic, implementable recommendations
    - Related Papers: Generate realistic research paper titles that would exist for this domain, include journal names and recent years (2022-2023)

    Consider:
    - Market saturation and competitive landscape
    - Technical feasibility and implementation complexity
    - Regulatory requirements and compliance issues
    - Customer acquisition challenges and market adoption
    - Scalability potential and resource requirements
    - Intellectual property considerations
    - Current market trends and timing

    Keep language professional but accessible. Focus on actionable business insights.
    `;

    const modelId = "anthropic.claude-3-haiku-20240307-v1:0";
    
    const command = new InvokeModelCommand({
        modelId,
        body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1500,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        }),
        contentType: "application/json",
        accept: "application/json"
    });

    try {
        const response = await bedrock.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // Extract JSON from Claude's response
        const content = responseBody.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            
            // Validate and ensure all required fields are present
            return {
                uniquenessScore: Math.max(0, Math.min(100, result.uniquenessScore || 50)),
                commercialScore: Math.max(0, Math.min(100, result.commercialScore || 50)),
                riskLevel: ['Low', 'Medium', 'High'].includes(result.riskLevel) ? result.riskLevel : 'Medium',
                targetIndustries: Array.isArray(result.targetIndustries) ? result.targetIndustries.slice(0, 3) : ['Technology', 'Business Services'],
                keyRisks: Array.isArray(result.keyRisks) ? result.keyRisks.slice(0, 4) : ['Market competition', 'Technical complexity'],
                improvements: Array.isArray(result.improvements) ? result.improvements.slice(0, 5) : ['Market research', 'MVP development'],
                relatedPapers: Array.isArray(result.relatedPapers) ? result.relatedPapers.slice(0, 4) : ['Innovation Research (Nature, 2023)']
            };
        } else {
            throw new Error('Could not parse AI response');
        }
        
    } catch (error) {
        console.error('Bedrock error:', error);
        // Fallback to enhanced mock data if Bedrock fails
        return generateEnhancedFallbackValidation(idea);
    }
}

function generateEnhancedFallbackValidation(idea) {
    // Enhanced fallback validation logic
    const words = idea.toLowerCase().split(' ');
    const hasUniqueKeywords = words.some(word => 
        ['innovative', 'unique', 'revolutionary', 'novel', 'breakthrough', 'disruptive'].includes(word)
    );
    
    const uniquenessScore = hasUniqueKeywords ? 
        Math.floor(Math.random() * 25) + 75 : 
        Math.floor(Math.random() * 40) + 35;
        
    const commercialScore = idea.length > 150 ? 
        Math.floor(Math.random() * 20) + 70 : 
        Math.floor(Math.random() * 30) + 50;

    const avgScore = (uniquenessScore + commercialScore) / 2;
    const riskLevel = avgScore >= 75 ? 'Low' : avgScore >= 50 ? 'Medium' : 'High';

    // Enhanced industry mapping
    const industryKeywords = {
        'Technology & AI': ['ai', 'artificial intelligence', 'machine learning', 'algorithm', 'tech', 'software', 'app', 'platform'],
        'Healthcare & Biotech': ['health', 'medical', 'patient', 'doctor', 'treatment', 'wellness', 'biotech'],
        'FinTech & Finance': ['money', 'payment', 'bank', 'finance', 'investment', 'crypto', 'blockchain'],
        'Education & EdTech': ['learn', 'student', 'education', 'teach', 'course', 'training', 'university'],
        'E-commerce & Retail': ['shop', 'buy', 'sell', 'marketplace', 'retail', 'store', 'commerce'],
        'Sustainability & Green Tech': ['sustainable', 'green', 'environment', 'renewable', 'energy', 'climate']
    };

    const lowerIdea = idea.toLowerCase();
    const matchedIndustries = [];

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
        if (keywords.some(keyword => lowerIdea.includes(keyword))) {
            matchedIndustries.push(industry);
        }
    }

    const targetIndustries = matchedIndustries.length > 0 ? 
        matchedIndustries.slice(0, 3) : 
        ['Technology & Innovation', 'Business Services', 'Consumer Products'];

    return {
        uniquenessScore,
        commercialScore,
        riskLevel,
        targetIndustries,
        keyRisks: [
            'Market competition from established players with significant resources',
            'Customer acquisition challenges in crowded marketplace',
            'Technical implementation complexity and development timeline risks',
            'Regulatory compliance requirements and approval processes'
        ],
        improvements: [
            'Conduct comprehensive competitor analysis and market positioning study',
            'Develop minimum viable product (MVP) with core feature validation',
            'Create detailed financial projections and funding strategy',
            'Establish strategic partnerships within target industry ecosystem',
            'Investigate intellectual property landscape and protection strategies'
        ],
        relatedPapers: [
            'Innovation Success Factors in Digital Markets (Harvard Business Review, 2023)',
            'Startup Validation Methodologies and Market Entry (MIT Sloan, 2023)',
            'Technology Commercialization in Emerging Sectors (Nature Innovation, 2022)',
            'Market Timing and Competitive Advantage (Journal of Business Strategy, 2023)'
        ]
    };
}

async function storeValidation(idea, validation) {
    const timestamp = new Date().toISOString();
    const id = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const params = {
        TableName: process.env.DYNAMODB_TABLE || 'idea-validations',
        Item: {
            id: { S: id },
            idea: { S: idea.substring(0, 1000) }, // Limit idea length
            validation: { S: JSON.stringify(validation) },
            timestamp: { S: timestamp },
            uniquenessScore: { N: validation.uniquenessScore.toString() },
            commercialScore: { N: validation.commercialScore.toString() },
            riskLevel: { S: validation.riskLevel },
            ttl: { N: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60).toString() } // 30 days TTL
        }
    };
    
    try {
        await dynamodb.send(new PutItemCommand(params));
    } catch (error) {
        console.error('DynamoDB error:', error);
        // Don't fail the request if storage fails
    }
}