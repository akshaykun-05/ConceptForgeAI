// ConceptForgeAI Data Management System
class DataManager {
    constructor() {
        this.storageKey = 'conceptforge_data';
        this.initializeStorage();
    }

    initializeStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            const initialData = {
                validations: [],
                analytics: {
                    totalValidations: 0,
                    avgUniqueness: 0,
                    avgCommercial: 0,
                    topIndustry: null,
                    industryDistribution: {},
                    scoreHistory: []
                },
                settings: {
                    theme: 'dark',
                    notifications: true
                }
            };
            localStorage.setItem(this.storageKey, JSON.stringify(initialData));
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.storageKey));
    }

    saveData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    addValidation(validation) {
        const data = this.getData();
        const validationRecord = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            idea: validation.idea,
            results: validation.results
        };
        
        data.validations.unshift(validationRecord);
        
        // Update analytics
        this.updateAnalytics(data, validation.results);
        
        this.saveData(data);
        return validationRecord;
    }

    updateAnalytics(data, results) {
        data.analytics.totalValidations++;
        
        // Update average scores
        const total = data.analytics.totalValidations;
        data.analytics.avgUniqueness = Math.round(
            ((data.analytics.avgUniqueness * (total - 1)) + results.uniquenessScore) / total
        );
        data.analytics.avgCommercial = Math.round(
            ((data.analytics.avgCommercial * (total - 1)) + results.commercialScore) / total
        );
        
        // Update industry distribution
        results.targetIndustries.forEach(industry => {
            data.analytics.industryDistribution[industry] = 
                (data.analytics.industryDistribution[industry] || 0) + 1;
        });
        
        // Update top industry
        data.analytics.topIndustry = this.getTopIndustry(data.analytics.industryDistribution);
        
        // Add to score history
        data.analytics.scoreHistory.push({
            timestamp: new Date().toISOString(),
            uniqueness: results.uniquenessScore,
            commercial: results.commercialScore
        });
        
        // Keep only last 20 entries for chart
        if (data.analytics.scoreHistory.length > 20) {
            data.analytics.scoreHistory = data.analytics.scoreHistory.slice(-20);
        }
    }

    getTopIndustry(distribution) {
        let topIndustry = null;
        let maxCount = 0;
        
        for (const [industry, count] of Object.entries(distribution)) {
            if (count > maxCount) {
                maxCount = count;
                topIndustry = industry;
            }
        }
        
        return topIndustry;
    }

    getValidations(filters = {}) {
        const data = this.getData();
        let validations = [...data.validations];
        
        // Apply search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            validations = validations.filter(v => 
                v.idea.toLowerCase().includes(searchTerm) ||
                v.results.targetIndustries.some(industry => 
                    industry.toLowerCase().includes(searchTerm)
                )
            );
        }
        
        // Apply risk filter
        if (filters.riskLevel) {
            validations = validations.filter(v => 
                v.results.riskLevel === filters.riskLevel
            );
        }
        
        // Apply sorting
        if (filters.sortBy) {
            validations.sort((a, b) => {
                switch (filters.sortBy) {
                    case 'date':
                        return new Date(b.timestamp) - new Date(a.timestamp);
                    case 'uniqueness':
                        return b.results.uniquenessScore - a.results.uniquenessScore;
                    case 'commercial':
                        return b.results.commercialScore - a.results.commercialScore;
                    default:
                        return 0;
                }
            });
        }
        
        return validations;
    }

    deleteValidation(id) {
        const data = this.getData();
        data.validations = data.validations.filter(v => v.id !== id);
        
        // Recalculate analytics
        this.recalculateAnalytics(data);
        
        this.saveData(data);
    }

    clearAllValidations() {
        const data = this.getData();
        data.validations = [];
        data.analytics = {
            totalValidations: 0,
            avgUniqueness: 0,
            avgCommercial: 0,
            topIndustry: null,
            industryDistribution: {},
            scoreHistory: []
        };
        this.saveData(data);
    }

    recalculateAnalytics(data) {
        const validations = data.validations;
        
        if (validations.length === 0) {
            data.analytics = {
                totalValidations: 0,
                avgUniqueness: 0,
                avgCommercial: 0,
                topIndustry: null,
                industryDistribution: {},
                scoreHistory: []
            };
            return;
        }
        
        data.analytics.totalValidations = validations.length;
        
        // Recalculate averages
        const totalUniqueness = validations.reduce((sum, v) => sum + v.results.uniquenessScore, 0);
        const totalCommercial = validations.reduce((sum, v) => sum + v.results.commercialScore, 0);
        
        data.analytics.avgUniqueness = Math.round(totalUniqueness / validations.length);
        data.analytics.avgCommercial = Math.round(totalCommercial / validations.length);
        
        // Recalculate industry distribution
        data.analytics.industryDistribution = {};
        validations.forEach(v => {
            v.results.targetIndustries.forEach(industry => {
                data.analytics.industryDistribution[industry] = 
                    (data.analytics.industryDistribution[industry] || 0) + 1;
            });
        });
        
        data.analytics.topIndustry = this.getTopIndustry(data.analytics.industryDistribution);
        
        // Rebuild score history
        data.analytics.scoreHistory = validations
            .slice(-20)
            .map(v => ({
                timestamp: v.timestamp,
                uniqueness: v.results.uniquenessScore,
                commercial: v.results.commercialScore
            }));
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    exportData() {
        const data = this.getData();
        const exportData = {
            ...data,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conceptforge-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    // Validate data structure
                    if (importedData.validations && importedData.analytics) {
                        this.saveData(importedData);
                        resolve(importedData);
                    } else {
                        reject(new Error('Invalid data format'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }
}

// Research Paper Database (Mock)
class ResearchDatabase {
    constructor() {
        this.papers = this.initializePapers();
    }

    initializePapers() {
        return [
            {
                id: 1,
                title: "Machine Learning Applications in Business Innovation and Startup Success Prediction",
                authors: ["Smith, J.", "Johnson, A.", "Williams, R."],
                journal: "Nature Machine Intelligence",
                year: 2023,
                abstract: "This study examines the application of machine learning algorithms in predicting startup success rates and identifying key innovation factors in business development.",
                keywords: ["machine learning", "startup", "innovation", "prediction", "business"],
                domain: "ai",
                citations: 127
            },
            {
                id: 2,
                title: "Digital Health Innovation Patterns and Market Validation Frameworks",
                authors: ["Brown, M.", "Davis, K.", "Miller, S."],
                journal: "New England Journal of Medicine",
                year: 2023,
                abstract: "Analysis of digital health innovation patterns and development of comprehensive market validation frameworks for healthcare technology startups.",
                keywords: ["digital health", "innovation", "validation", "healthcare", "technology"],
                domain: "health",
                citations: 89
            },
            {
                id: 3,
                title: "FinTech Innovation and Market Disruption: A Comprehensive Analysis",
                authors: ["Wilson, P.", "Taylor, L.", "Anderson, C."],
                journal: "Journal of Financial Innovation",
                year: 2023,
                abstract: "Comprehensive analysis of FinTech innovation patterns, market disruption mechanisms, and success factors in financial technology startups.",
                keywords: ["fintech", "innovation", "disruption", "financial technology", "market analysis"],
                domain: "finance",
                citations: 156
            },
            {
                id: 4,
                title: "Educational Technology Market Analysis and Learning Outcome Optimization",
                authors: ["Garcia, R.", "Martinez, E.", "Lopez, A."],
                journal: "Computers & Education",
                year: 2023,
                abstract: "Market analysis of educational technology solutions and optimization strategies for improving learning outcomes through digital platforms.",
                keywords: ["edtech", "education", "learning outcomes", "digital platforms", "market analysis"],
                domain: "education",
                citations: 73
            },
            {
                id: 5,
                title: "Sustainable Business Model Innovation and Green Technology Adoption",
                authors: ["Thompson, D.", "White, J.", "Clark, M."],
                journal: "Journal of Cleaner Production",
                year: 2023,
                abstract: "Investigation of sustainable business model innovation patterns and factors influencing green technology adoption in various industries.",
                keywords: ["sustainability", "green technology", "business model", "innovation", "adoption"],
                domain: "sustainability",
                citations: 94
            },
            {
                id: 6,
                title: "Artificial Intelligence in Market Research and Consumer Behavior Analysis",
                authors: ["Lee, S.", "Kim, H.", "Park, J."],
                journal: "Journal of Marketing Research",
                year: 2022,
                abstract: "Application of AI techniques in market research methodologies and consumer behavior analysis for improved business decision making.",
                keywords: ["artificial intelligence", "market research", "consumer behavior", "business intelligence"],
                domain: "ai",
                citations: 112
            },
            {
                id: 7,
                title: "Blockchain Technology Applications in Supply Chain Innovation",
                authors: ["Chen, L.", "Wang, X.", "Zhang, Y."],
                journal: "Supply Chain Management",
                year: 2022,
                abstract: "Exploration of blockchain technology applications in supply chain management and innovation opportunities for startups.",
                keywords: ["blockchain", "supply chain", "innovation", "technology", "management"],
                domain: "finance",
                citations: 68
            },
            {
                id: 8,
                title: "Healthcare AI: Diagnostic Innovation and Market Opportunities",
                authors: ["Patel, N.", "Singh, R.", "Kumar, A."],
                journal: "Nature Medicine",
                year: 2022,
                abstract: "Analysis of AI applications in healthcare diagnostics and identification of market opportunities for medical technology innovation.",
                keywords: ["healthcare AI", "diagnostics", "medical technology", "innovation", "market opportunities"],
                domain: "health",
                citations: 203
            }
        ];
    }

    searchPapers(query, filters = {}) {
        let results = [...this.papers];
        
        if (query) {
            const searchTerm = query.toLowerCase();
            results = results.filter(paper => 
                paper.title.toLowerCase().includes(searchTerm) ||
                paper.abstract.toLowerCase().includes(searchTerm) ||
                paper.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm)) ||
                paper.authors.some(author => author.toLowerCase().includes(searchTerm))
            );
        }
        
        if (filters.year) {
            results = results.filter(paper => paper.year.toString() === filters.year);
        }
        
        if (filters.domain) {
            results = results.filter(paper => paper.domain === filters.domain);
        }
        
        // Sort by citations (relevance)
        results.sort((a, b) => b.citations - a.citations);
        
        return results;
    }

    identifyResearchGaps(query) {
        const gaps = [
            "Limited research on real-time implementation challenges",
            "Insufficient studies on user adoption barriers",
            "Gap in long-term sustainability analysis",
            "Need for cross-cultural validation studies",
            "Limited investigation of scalability factors",
            "Insufficient analysis of regulatory compliance impact",
            "Gap in cost-benefit analysis methodologies",
            "Need for interdisciplinary collaboration frameworks"
        ];
        
        // Return 3-4 relevant gaps based on query
        return gaps.sort(() => 0.5 - Math.random()).slice(0, 4);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataManager, ResearchDatabase };
}