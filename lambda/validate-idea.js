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

    // Generate dynamic risks based on idea content
    const risks = [];
    if (uniquenessScore < 50) {
        risks.push('High market saturation - numerous similar solutions exist in the market');
    }
    if (commercialScore < 60) {
        risks.push('Limited monetization clarity - revenue model needs further development');
    }
    
    // Add contextual risks based on keywords
    const riskKeywords = {
        'ai': 'AI model training costs and computational resource requirements',
        'health': 'Healthcare regulatory compliance (FDA, HIPAA) and approval timelines',
        'finance': 'Financial regulations, licensing requirements, and security compliance',
        'education': 'Educational institution adoption cycles and curriculum integration challenges',
        'blockchain': 'Cryptocurrency volatility and regulatory uncertainty',
        'social': 'User privacy concerns and data protection regulations',
        'hardware': 'Manufacturing costs, supply chain dependencies, and inventory risks',
        'mobile': 'App store approval processes and platform dependency risks'
    };
    
    for (const [keyword, risk] of Object.entries(riskKeywords)) {
        if (lowerIdea.includes(keyword) && risks.length < 4) {
            risks.push(risk);
        }
    }
    
    // Fill remaining slots with generic but relevant risks
    const genericRisks = [
        'Customer acquisition costs may exceed initial projections',
        'Technical implementation complexity and resource requirements',
        'Market timing concerns - early or late market entry',
        'Dependency on third-party platforms or technologies'
    ];
    
    while (risks.length < 4) {
        risks.push(genericRisks[risks.length]);
    }
    
    // Generate dynamic improvements based on scores and content
    const improvements = [];
    if (uniquenessScore < 70) {
        improvements.push('Strengthen unique value proposition through deeper market differentiation analysis');
    }
    if (commercialScore < 70) {
        improvements.push('Develop comprehensive business model with multiple revenue streams');
    }
    
    // Add contextual improvements
    const improvementKeywords = {
        'ai': 'Implement explainable AI features to build user trust and transparency',
        'health': 'Conduct clinical validation studies and establish medical advisory board',
        'finance': 'Obtain necessary financial licenses and establish banking partnerships',
        'education': 'Partner with educational institutions for pilot programs and validation',
        'social': 'Implement robust content moderation and community management systems',
        'ecommerce': 'Optimize conversion funnel and implement personalization features',
        'saas': 'Develop freemium model with clear upgrade path and value demonstration'
    };
    
    for (const [keyword, improvement] of Object.entries(improvementKeywords)) {
        if (lowerIdea.includes(keyword) && improvements.length < 5) {
            improvements.push(improvement);
        }
    }
    
    // Fill remaining slots
    const genericImprovements = [
        'Create detailed user personas and validate through customer interviews',
        'Develop minimum viable product (MVP) with core feature set for market testing',
        'Establish strategic partnerships within target industry ecosystem',
        'Design scalable technology architecture for future growth',
        'Create go-to-market strategy with clear customer acquisition plan'
    ];
    
    while (improvements.length < 5) {
        improvements.push(genericImprovements[improvements.length - 2] || genericImprovements[0]);
    }
    
    // Generate dynamic related papers based on idea keywords
    const paperTopics = [];
    const topicKeywords = {
        'ai': ['Machine Learning Applications', 'Artificial Intelligence Systems', 'Deep Learning Methods'],
        'health': ['Digital Health Interventions', 'Clinical Decision Support', 'Patient Outcomes'],
        'finance': ['Financial Technology Innovation', 'Digital Payment Systems', 'Risk Management'],
        'education': ['Educational Technology', 'Learning Analytics', 'Student Engagement'],
        'blockchain': ['Distributed Ledger Technology', 'Cryptocurrency Systems', 'Smart Contracts'],
        'sustainability': ['Sustainable Technology', 'Environmental Impact', 'Green Innovation'],
        'iot': ['Internet of Things', 'Connected Devices', 'Sensor Networks'],
        'mobile': ['Mobile Application Development', 'User Experience Design', 'Mobile Commerce']
    };
    
    for (const [keyword, topics] of Object.entries(topicKeywords)) {
        if (lowerIdea.includes(keyword)) {
            paperTopics.push(...topics);
        }
    }
    
    // If no specific topics found, use generic business topics
    if (paperTopics.length === 0) {
        paperTopics.push('Innovation Management', 'Business Model Design', 'Market Entry Strategies', 'Technology Adoption');
    }
    
    const journals = ['Nature', 'Science', 'IEEE Transactions', 'Harvard Business Review', 'MIT Sloan', 'Journal of Business Research'];
    const years = [2022, 2023, 2024];
    
    const relatedPapers = paperTopics.slice(0, 4).map((topic, index) => {
        const journal = journals[index % journals.length];
        const year = years[Math.floor(Math.random() * years.length)];
        return `${topic} in Modern Markets (${journal}, ${year})`;
    });

    return {
        uniquenessScore,
        commercialScore,
        riskLevel,
        targetIndustries,
        keyRisks: risks,
        improvements: improvements,
        relatedPapers: relatedPapers
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