// Configuration file for ConceptForgeAI
// This will be automatically updated during deployment

const CONFIG = {
    // API Configuration - will be updated by deploy script
    API_ENDPOINT: 'https://fsnpltvv61.execute-api.us-east-1.amazonaws.com/prod/validate',
    
    // Environment Settings
    ENVIRONMENT: 'production',
    USE_MOCK_DATA: true, // Temporarily true until Bedrock access is configured
    USE_REAL_RESEARCH: true, // Always use real research APIs (arXiv, PubMed)
    
    // Application Settings
    MAX_IDEA_LENGTH: 2000,
    MIN_IDEA_LENGTH: 10,
    
    // UI Settings
    ANIMATION_DURATION: 500,
    SCORE_ANIMATION_STEPS: 60,
    
    // Feature Flags
    ENABLE_ANALYTICS: true,
    ENABLE_EXPORT: true,
    ENABLE_RESEARCH_INTEGRATION: true,
    
    // Rate Limiting (for production)
    MAX_VALIDATIONS_PER_HOUR: 50, // Increased for real usage
    MAX_RESEARCH_QUERIES_PER_HOUR: 30,
    
    // Academic Database Integration
    ACADEMIC_APIS: {
        PUBMED_ENABLED: true,
        ARXIV_ENABLED: true,
        SEMANTIC_SCHOLAR_ENABLED: true,
        CROSSREF_ENABLED: true
    },
    
    // Branding
    APP_NAME: 'ConceptForgeAI',
    APP_TAGLINE: 'AI-Powered Idea Validation Platform',
    COMPANY_NAME: 'ConceptForgeAI',
    SUPPORT_EMAIL: 'support@conceptforge.ai'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}