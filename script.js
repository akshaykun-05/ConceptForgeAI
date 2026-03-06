class ConceptForgeAI {
    constructor() {
        this.dataManager = new DataManager();
        this.researchDB = new ResearchDatabase();
        this.currentPage = 'dashboard';
        
        this.initializeElements();
        this.bindEvents();
        this.initializeNavigation();
        this.initializeCharCounter();
        this.loadAnalytics();
        this.loadHistory();
    }

    initializeElements() {
        // Dashboard elements
        this.ideaInput = document.getElementById('ideaInput');
        this.validateBtn = document.getElementById('validateBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.btnText = document.querySelector('.btn-text');
        this.btnLoading = document.querySelector('.btn-loading');
        this.charCount = document.getElementById('charCount');

        // Research elements
        this.researchQuery = document.getElementById('researchQuery');
        this.searchResearchBtn = document.getElementById('searchResearchBtn');
        this.yearFilter = document.getElementById('yearFilter');
        this.domainFilter = document.getElementById('domainFilter');
        this.researchResults = document.getElementById('researchResults');
        this.researchGaps = document.getElementById('researchGaps');

        // Analytics elements
        this.totalValidations = document.getElementById('totalValidations');
        this.avgUniqueness = document.getElementById('avgUniqueness');
        this.avgCommercial = document.getElementById('avgCommercial');
        this.topIndustry = document.getElementById('topIndustry');

        // History elements
        this.historySearch = document.getElementById('historySearch');
        this.sortBy = document.getElementById('sortBy');
        this.filterRisk = document.getElementById('filterRisk');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.historyList = document.getElementById('historyList');
    }

    bindEvents() {
        // Dashboard events - check if elements exist before binding
        if (this.validateBtn) {
            this.validateBtn.addEventListener('click', () => {
                console.log('Validate button clicked');
                this.validateIdea();
            });
        } else {
            console.error('validateBtn not found');
        }
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearInput());
        }
        if (this.ideaInput) {
            this.ideaInput.addEventListener('input', () => this.updateCharCounter());
            this.ideaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.validateIdea();
                }
            });
        } else {
            console.error('ideaInput not found');
        }

        // Research events
        if (this.searchResearchBtn) {
            this.searchResearchBtn.addEventListener('click', () => this.searchResearch());
        }
        if (this.researchQuery) {
            this.researchQuery.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchResearch();
                }
            });
        }
        if (this.yearFilter) {
            this.yearFilter.addEventListener('change', () => this.searchResearch());
        }
        if (this.domainFilter) {
            this.domainFilter.addEventListener('change', () => this.searchResearch());
        }

        // History events
        if (this.historySearch) {
            this.historySearch.addEventListener('input', () => this.filterHistory());
        }
        if (this.sortBy) {
            this.sortBy.addEventListener('change', () => this.filterHistory());
        }
        if (this.filterRisk) {
            this.filterRisk.addEventListener('change', () => this.filterHistory());
        }
        if (this.clearHistoryBtn) {
            this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }

        // Export button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-export')) {
                this.exportReport();
            }
        });
    }

    initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const pages = document.querySelectorAll('.page');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPage = link.getAttribute('data-page');
                this.switchToPage(targetPage);
            });
        });

        // Make switchToPage globally available
        window.switchToPage = (pageName) => this.switchToPage(pageName);
    }

    switchToPage(pageName) {
        const navLinks = document.querySelectorAll('.nav-link');
        const pages = document.querySelectorAll('.page');

        // Update active nav link
        navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`[data-page="${pageName}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Show target page
        pages.forEach(page => {
            page.classList.remove('active');
            if (page.id === pageName) {
                page.classList.add('active');
                page.classList.add('fade-in');
            }
        });

        this.currentPage = pageName;

        // Load page-specific data
        switch (pageName) {
            case 'analytics':
                this.loadAnalytics();
                this.renderCharts();
                break;
            case 'history':
                this.loadHistory();
                break;
        }
    }

    initializeCharCounter() {
        if (this.ideaInput && this.charCount) {
            this.updateCharCounter();
        }
    }

    updateCharCounter() {
        if (!this.ideaInput || !this.charCount) return;
        
        const length = this.ideaInput.value.length;
        this.charCount.textContent = length;
        
        // Update color based on length
        if (length > CONFIG.MAX_IDEA_LENGTH * 0.9) {
            this.charCount.style.color = 'var(--neon-pink)';
        } else if (length > CONFIG.MAX_IDEA_LENGTH * 0.7) {
            this.charCount.style.color = 'var(--neon-purple)';
        } else {
            this.charCount.style.color = 'var(--text-muted)';
        }
    }

    clearInput() {
        if (!this.ideaInput) return;
        
        this.ideaInput.value = '';
        this.updateCharCounter();
        this.ideaInput.focus();
    }

    async validateIdea() {
        console.log('validateIdea called');
        
        if (!this.ideaInput) {
            console.error('Input element not found!');
            this.showNotification('Input element not found!', 'error');
            return;
        }
        
        const idea = this.ideaInput.value.trim();
        console.log('Idea length:', idea.length);
        
        if (!idea) {
            this.showNotification('Please enter your concept first!', 'warning');
            return;
        }
        
        if (idea.length < CONFIG.MIN_IDEA_LENGTH) {
            this.showNotification(`Please provide more detail. Your concept should be at least ${CONFIG.MIN_IDEA_LENGTH} characters.`, 'warning');
            return;
        }
        
        if (idea.length > CONFIG.MAX_IDEA_LENGTH) {
            this.showNotification(`Your concept is too long. Please keep it under ${CONFIG.MAX_IDEA_LENGTH} characters.`, 'warning');
            return;
        }

        console.log('Starting validation...');
        this.setLoadingState(true);
        
        try {
            const result = await this.callValidationAPI(idea);
            console.log('Validation result:', result);
            
            // Save to local storage
            this.dataManager.addValidation({
                idea: idea,
                results: result
            });
            
            this.displayResults(result);
            this.showNotification('Validation completed successfully!', 'success');
        } catch (error) {
            console.error('Validation error:', error);
            this.showNotification('Sorry, there was an error validating your concept. Please try again.', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    async callValidationAPI(idea) {
        // Use configuration for API endpoint
        const apiEndpoint = CONFIG.API_ENDPOINT;
        console.log('API Endpoint:', apiEndpoint);
        console.log('USE_MOCK_DATA:', CONFIG.USE_MOCK_DATA);
        
        // Check if we should use mock data (for development)
        if (CONFIG.USE_MOCK_DATA || apiEndpoint === 'YOUR_API_GATEWAY_ENDPOINT_HERE/validate') {
            console.log('Using mock data');
            await this.delay(3000); // Simulate processing time
            return this.generateEnhancedMockValidation(idea);
        }
        
        try {
            console.log('Calling real API...');
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idea })
            });
            
            console.log('API Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('API Response data:', data);
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            console.log('Falling back to mock data');
            // Fallback to mock data if API fails
            await this.delay(1000);
            return this.generateEnhancedMockValidation(idea);
        }
    }

    generateEnhancedMockValidation(idea) {
        // Enhanced AI analysis with research paper simulation
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

        const industries = this.suggestIndustries(idea);
        const risks = this.identifyRisks(idea, uniquenessScore, commercialScore);
        const improvements = this.suggestImprovements(idea, uniquenessScore, commercialScore);
        const relatedPapers = this.generateRelatedResearch(idea);

        return {
            uniquenessScore,
            commercialScore,
            riskLevel: this.calculateRiskLevel(uniquenessScore, commercialScore),
            targetIndustries: industries,
            keyRisks: risks,
            improvements: improvements,
            relatedPapers: relatedPapers
        };
    }

    calculateRiskLevel(uniquenessScore, commercialScore) {
        const avgScore = (uniquenessScore + commercialScore) / 2;
        if (avgScore >= 75) return 'Low';
        if (avgScore >= 50) return 'Medium';
        return 'High';
    }

    suggestIndustries(idea) {
        const industryKeywords = {
            'Technology & AI': ['ai', 'artificial intelligence', 'machine learning', 'algorithm', 'automation', 'tech', 'software', 'app', 'platform', 'digital'],
            'Healthcare & Biotech': ['health', 'medical', 'patient', 'doctor', 'treatment', 'wellness', 'biotech', 'pharmaceutical', 'therapy', 'diagnosis'],
            'Education & EdTech': ['learn', 'student', 'education', 'teach', 'course', 'training', 'university', 'school', 'knowledge', 'skill'],
            'FinTech & Finance': ['money', 'payment', 'bank', 'finance', 'investment', 'crypto', 'blockchain', 'trading', 'loan', 'insurance'],
            'E-commerce & Retail': ['shop', 'buy', 'sell', 'marketplace', 'retail', 'store', 'commerce', 'product', 'customer', 'brand'],
            'Entertainment & Media': ['game', 'music', 'video', 'entertainment', 'media', 'content', 'streaming', 'social', 'creative', 'art'],
            'Transportation & Logistics': ['transport', 'car', 'travel', 'delivery', 'logistics', 'mobility', 'shipping', 'vehicle', 'route', 'supply'],
            'Sustainability & Green Tech': ['sustainable', 'green', 'environment', 'renewable', 'energy', 'climate', 'carbon', 'eco', 'clean', 'waste'],
            'Real Estate & PropTech': ['property', 'real estate', 'housing', 'building', 'construction', 'architecture', 'space', 'rental', 'mortgage'],
            'Food & AgTech': ['food', 'restaurant', 'agriculture', 'farming', 'nutrition', 'cooking', 'meal', 'grocery', 'organic', 'crop']
        };

        const lowerIdea = idea.toLowerCase();
        const matchedIndustries = [];

        for (const [industry, keywords] of Object.entries(industryKeywords)) {
            const matchCount = keywords.filter(keyword => lowerIdea.includes(keyword)).length;
            if (matchCount > 0) {
                matchedIndustries.push({ industry, relevance: matchCount });
            }
        }

        // Sort by relevance and return top 3
        return matchedIndustries
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 3)
            .map(item => item.industry);
    }

    identifyRisks(idea, uniquenessScore, commercialScore) {
        const risks = [];
        
        if (uniquenessScore < 50) {
            risks.push('High market saturation - numerous similar solutions exist in the market');
        }
        
        if (commercialScore < 60) {
            risks.push('Limited monetization clarity - revenue model needs further development');
        }
        
        if (idea.length < 100) {
            risks.push('Insufficient concept detail - requires more comprehensive development');
        }
        
        const contextualRisks = [
            'Regulatory compliance challenges in target markets',
            'High customer acquisition costs due to market competition',
            'Technical implementation complexity and resource requirements',
            'Scalability limitations with current proposed architecture',
            'Intellectual property protection and patent landscape risks',
            'Market timing concerns - early or late market entry',
            'Dependency on third-party platforms or technologies',
            'User adoption barriers and behavior change requirements'
        ];
        
        // Add 2-3 contextual risks based on idea content
        const additionalRisks = contextualRisks
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.max(1, 4 - risks.length));
        
        risks.push(...additionalRisks);
        
        return risks.slice(0, 4);
    }

    suggestImprovements(idea, uniquenessScore, commercialScore) {
        const improvements = [];
        
        if (uniquenessScore < 70) {
            improvements.push('Strengthen unique value proposition through deeper market differentiation analysis');
        }
        
        if (commercialScore < 70) {
            improvements.push('Develop comprehensive business model with multiple revenue streams');
        }
        
        const strategicImprovements = [
            'Conduct extensive competitor analysis and market positioning study',
            'Create detailed user personas and validate through customer interviews',
            'Develop minimum viable product (MVP) with core feature set for market testing',
            'Establish strategic partnerships within target industry ecosystem',
            'Investigate intellectual property landscape and protection strategies',
            'Design scalable technology architecture for future growth',
            'Create go-to-market strategy with clear customer acquisition plan',
            'Develop financial projections and funding requirements analysis'
        ];
        
        const additionalImprovements = strategicImprovements
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.max(2, 5 - improvements.length));
            
        improvements.push(...additionalImprovements);
        
        return improvements.slice(0, 5);
    }

    generateRelatedResearch(idea) {
        // Use the research database to find relevant papers
        const results = this.researchDB.searchPapers(idea);
        return results.slice(0, 4).map(paper => 
            `${paper.title} (${paper.journal}, ${paper.year})`
        );
    }

    displayResults(result) {
        // Update scores with enhanced animation
        this.animateScore('uniquenessScore', result.uniquenessScore, 'uniqueness-fill');
        this.animateScore('commercialScore', result.commercialScore, 'commercial-fill');
        
        // Update risk level
        this.updateRiskLevel(result.riskLevel);
        
        // Update lists with enhanced styling
        this.updateList('targetIndustries', result.targetIndustries);
        this.updateList('keyRisks', result.keyRisks);
        this.updateList('improvements', result.improvements);
        this.updateList('relatedPapers', result.relatedPapers);
        
        // Show results section with enhanced animation
        this.resultsSection.style.display = 'block';
        this.resultsSection.classList.add('slide-up');
        
        // Scroll to results smoothly
        setTimeout(() => {
            this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }

    animateScore(elementId, targetScore, fillClass) {
        const element = document.getElementById(elementId);
        const fillElement = document.querySelector(`.${fillClass}`);
        let currentScore = 0;
        const increment = targetScore / 60; // Slower animation
        
        const animation = setInterval(() => {
            currentScore += increment;
            if (currentScore >= targetScore) {
                currentScore = targetScore;
                clearInterval(animation);
            }
            element.textContent = Math.round(currentScore);
            if (fillElement) {
                fillElement.style.width = `${currentScore}%`;
            }
        }, 25);
    }

    updateRiskLevel(riskLevel) {
        const riskElement = document.getElementById('riskLevel');
        const riskDot = document.querySelector('.risk-dot');
        
        riskElement.textContent = riskLevel;
        
        // Update colors based on risk level
        const colors = {
            'Low': 'var(--neon-cyan)',
            'Medium': 'var(--neon-purple)', 
            'High': 'var(--neon-pink)'
        };
        
        const color = colors[riskLevel] || 'var(--neon-cyan)';
        riskElement.style.color = color;
        if (riskDot) {
            riskDot.style.background = color;
        }
    }

    updateList(elementId, items) {
        const element = document.getElementById(elementId);
        element.innerHTML = '';
        
        items.forEach((item, index) => {
            const li = document.createElement('li');
            
            // Make related papers clickable
            if (elementId === 'relatedPapers') {
                // Extract paper title from format "Title (Journal, Year)"
                const match = item.match(/^(.+?)\s*\((.+?),\s*(\d{4})\)$/);
                if (match) {
                    const [, title, journal] = match;
                    li.innerHTML = `
                        <span class="paper-link" onclick="app.searchPaperByTitle('${title.replace(/'/g, "\\'")}')">
                            <i class="fas fa-file-alt"></i> ${item}
                        </span>
                    `;
                    li.style.cursor = 'pointer';
                } else {
                    li.textContent = item;
                }
            } else {
                li.textContent = item;
            }
            
            li.style.animationDelay = `${index * 0.1}s`;
            li.classList.add('fade-in');
            element.appendChild(li);
        });
    }

    setLoadingState(isLoading) {
        if (this.validateBtn) {
            this.validateBtn.disabled = isLoading;
        }
        if (this.btnText) {
            this.btnText.style.display = isLoading ? 'none' : 'inline';
        }
        if (this.btnLoading) {
            this.btnLoading.style.display = isLoading ? 'inline' : 'none';
        }
        
        // Add loading effect to AI visual
        const aiCore = document.querySelector('.brain-core');
        if (aiCore) {
            if (isLoading) {
                aiCore.style.animation = 'float 1s ease-in-out infinite, pulse 2s ease-in-out infinite';
            } else {
                aiCore.style.animation = 'float 3s ease-in-out infinite';
            }
        }
    }

    // Enhanced research search with real academic APIs
    async searchResearch() {
        if (!this.researchQuery) {
            this.showNotification('Research elements not found!', 'error');
            return;
        }
        
        const query = this.researchQuery.value.trim();
        const yearFilter = this.yearFilter ? this.yearFilter.value : '';
        const domainFilter = this.domainFilter ? this.domainFilter.value : '';

        if (!query) {
            this.showNotification('Please enter a research query', 'warning');
            return;
        }

        // Show loading state
        if (this.searchResearchBtn) {
            this.searchResearchBtn.disabled = true;
            this.searchResearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        }

        try {
            let results, gaps;

            // Check if academic APIs are enabled and we have a real endpoint
            if (CONFIG.ACADEMIC_APIS && CONFIG.ACADEMIC_APIS.PUBMED_ENABLED && !CONFIG.USE_MOCK_DATA) {
                // Use real academic API integration
                const sources = [];
                if (CONFIG.ACADEMIC_APIS.PUBMED_ENABLED) sources.push('pubmed');
                if (CONFIG.ACADEMIC_APIS.ARXIV_ENABLED) sources.push('arxiv');
                if (CONFIG.ACADEMIC_APIS.SEMANTIC_SCHOLAR_ENABLED) sources.push('semantic-scholar');
                if (CONFIG.ACADEMIC_APIS.CROSSREF_ENABLED) sources.push('crossref');

                const response = await fetch(`${CONFIG.API_ENDPOINT.replace('/validate', '/research')}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query: query,
                        sources: sources,
                        maxResults: 15
                    })
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const data = await response.json();
                results = data.papers || [];
                gaps = data.researchGaps || [];

                // Apply frontend filters
                if (yearFilter) {
                    results = results.filter(paper => paper.year.toString() === yearFilter);
                }

                if (domainFilter) {
                    const domainKeywords = {
                        'ai': ['artificial intelligence', 'machine learning', 'deep learning', 'neural network'],
                        'health': ['medical', 'clinical', 'patient', 'healthcare', 'biomedical'],
                        'finance': ['financial', 'economic', 'banking', 'investment', 'fintech'],
                        'education': ['educational', 'learning', 'student', 'teaching', 'pedagogy'],
                        'sustainability': ['sustainable', 'environmental', 'green', 'renewable', 'climate']
                    };

                    const keywords = domainKeywords[domainFilter] || [];
                    results = results.filter(paper => {
                        const text = (paper.title + ' ' + paper.abstract).toLowerCase();
                        return keywords.some(keyword => text.includes(keyword));
                    });
                }

            } else {
                // Fallback to mock database
                const filters = {};
                if (yearFilter) filters.year = yearFilter;
                if (domainFilter) filters.domain = domainFilter;

                results = this.researchDB.searchPapers(query, filters);
                gaps = this.researchDB.identifyResearchGaps(query);
            }

            this.displayResearchResults(results);
            this.displayResearchGaps(gaps);
            
            this.showNotification(`Found ${results.length} relevant papers`, 'success');

        } catch (error) {
            console.error('Research search error:', error);
            this.showNotification('Research search failed. Using local database.', 'warning');
            
            // Fallback to mock database
            const filters = {};
            if (yearFilter) filters.year = yearFilter;
            if (domainFilter) filters.domain = domainFilter;

            const results = this.researchDB.searchPapers(query, filters);
            const gaps = this.researchDB.identifyResearchGaps(query);

            this.displayResearchResults(results);
            this.displayResearchGaps(gaps);
        } finally {
            // Reset loading state
            if (this.searchResearchBtn) {
                this.searchResearchBtn.disabled = false;
                this.searchResearchBtn.innerHTML = '<i class="fas fa-search"></i> Search Papers';
            }
        }
    }

    displayResearchResults(results) {
        const resultsSection = this.researchResults;
        const papersList = document.getElementById('papersList');
        const resultsCount = document.getElementById('resultsCount');

        resultsCount.textContent = `${results.length} papers found`;
        
        papersList.innerHTML = '';
        
        if (results.length === 0) {
            papersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No Papers Found</h3>
                    <p>Try adjusting your search terms or filters</p>
                </div>
            `;
        } else {
            results.forEach((paper, index) => {
                const paperElement = document.createElement('div');
                paperElement.className = 'paper-item';
                paperElement.style.animationDelay = `${index * 0.1}s`;
                
                // Format authors
                const authors = Array.isArray(paper.authors) ? paper.authors.slice(0, 3).join(', ') : 'Unknown Authors';
                const moreAuthors = Array.isArray(paper.authors) && paper.authors.length > 3 ? ` et al.` : '';
                
                // Format citation info
                const citationInfo = paper.citations ? `${paper.citations} citations` : 'Citation count unavailable';
                
                // Format source badge
                const sourceBadge = paper.source ? `<span class="source-badge">${paper.source}</span>` : '';
                
                paperElement.innerHTML = `
                    <div class="paper-header">
                        <div class="paper-title">${paper.title}</div>
                        ${sourceBadge}
                    </div>
                    <div class="paper-meta">
                        ${authors}${moreAuthors} • ${paper.journal} • ${paper.year} • ${citationInfo}
                    </div>
                    <div class="paper-abstract">${paper.abstract}</div>
                    <div class="paper-actions">
                        ${paper.doi ? `<a href="https://doi.org/${paper.doi}" target="_blank" class="action-chip">
                            <i class="fas fa-external-link-alt"></i> View Paper
                        </a>` : ''}
                        ${paper.url ? `<a href="${paper.url}" target="_blank" class="action-chip">
                            <i class="fas fa-link"></i> Source
                        </a>` : ''}
                        <a href="#" class="action-chip" onclick="app.validateFromPaper('${paper.title.replace(/'/g, "\\'")}')">
                            <i class="fas fa-flask"></i> Validate Similar Idea
                        </a>
                        <a href="#" class="action-chip" onclick="app.findRelatedValidations('${paper.journal}')">
                            <i class="fas fa-history"></i> Related Validations
                        </a>
                    </div>
                `;
                paperElement.classList.add('fade-in');
                papersList.appendChild(paperElement);
            });
        }
    }

    displayResearchGaps(gaps) {
        const gapsContent = this.researchGaps;
        gapsContent.innerHTML = '';
        
        const gapsList = document.createElement('ul');
        gapsList.className = 'insight-list';
        
        gaps.forEach((gap, index) => {
            const li = document.createElement('li');
            li.textContent = gap;
            li.style.animationDelay = `${index * 0.1}s`;
            li.classList.add('fade-in');
            gapsList.appendChild(li);
        });
        
        gapsContent.appendChild(gapsList);
    }

    // Cross-page navigation and interlinking methods
    searchRelatedResearch() {
        const industries = Array.from(document.querySelectorAll('#targetIndustries li'))
            .map(li => li.textContent);
        
        if (industries.length > 0) {
            this.switchToPage('research');
            setTimeout(() => {
                this.researchQuery.value = industries[0];
                this.searchResearch();
            }, 300);
        }
    }

    viewSimilarRisks() {
        this.switchToPage('history');
        setTimeout(() => {
            // Filter history by similar risk patterns
            this.filterHistory();
        }, 300);
    }

    saveToHistory() {
        // This is automatically done in validateIdea, just show confirmation
        this.showNotification('Analysis saved to history successfully!', 'success');
        setTimeout(() => {
            this.switchToPage('history');
        }, 1000);
    }

    validateFromPaper(paperTitle) {
        this.switchToPage('dashboard');
        setTimeout(() => {
            this.ideaInput.value = `Inspired by "${paperTitle}", develop a commercial application that addresses the research findings and creates market value.`;
            this.updateCharCounter();
            this.ideaInput.focus();
        }, 300);
    }

    findRelatedValidations(searchTerm) {
        this.switchToPage('history');
        setTimeout(() => {
            this.historySearch.value = searchTerm;
            this.filterHistory();
        }, 300);
    }

    // Analytics Page Methods
    loadAnalytics() {
        const data = this.dataManager.getData();
        const analytics = data.analytics;

        if (this.totalValidations) {
            this.totalValidations.textContent = analytics.totalValidations;
            this.avgUniqueness.textContent = analytics.avgUniqueness;
            this.avgCommercial.textContent = analytics.avgCommercial;
            this.topIndustry.textContent = analytics.topIndustry || '-';
        }

        this.updateAnalyticsInsights(analytics);
    }

    updateAnalyticsInsights(analytics) {
        const insightsElement = document.getElementById('analyticsInsights');
        if (!insightsElement) return;

        if (analytics.totalValidations === 0) {
            insightsElement.innerHTML = '<p class="placeholder-text">Complete more validations to see personalized insights and patterns</p>';
            return;
        }

        const insights = [];
        
        if (analytics.avgUniqueness > 70) {
            insights.push('Your concepts show strong innovation potential with high uniqueness scores');
        }
        
        if (analytics.avgCommercial > 70) {
            insights.push('Your ideas demonstrate excellent commercial viability');
        }
        
        if (analytics.topIndustry) {
            insights.push(`You show particular strength in ${analytics.topIndustry} concepts`);
        }

        const insightsList = document.createElement('ul');
        insightsList.className = 'insight-list';
        
        insights.forEach(insight => {
            const li = document.createElement('li');
            li.textContent = insight;
            insightsList.appendChild(li);
        });
        
        insightsElement.innerHTML = '';
        insightsElement.appendChild(insightsList);
    }

    renderCharts() {
        // Simple chart rendering without external libraries
        this.renderScoresChart();
        this.renderIndustryChart();
    }

    renderScoresChart() {
        const canvas = document.getElementById('scoresChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.dataManager.getData();
        const scoreHistory = data.analytics.scoreHistory;

        if (scoreHistory.length === 0) {
            ctx.fillStyle = 'var(--text-muted)';
            ctx.font = '16px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw simple line chart
        const padding = 40;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;

        // Draw axes
        ctx.strokeStyle = 'var(--glass-border)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();

        // Draw data points
        if (scoreHistory.length > 1) {
            const stepX = chartWidth / (scoreHistory.length - 1);
            
            // Uniqueness line
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            scoreHistory.forEach((point, index) => {
                const x = padding + index * stepX;
                const y = canvas.height - padding - (point.uniqueness / 100) * chartHeight;
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();

            // Commercial line
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            scoreHistory.forEach((point, index) => {
                const x = padding + index * stepX;
                const y = canvas.height - padding - (point.commercial / 100) * chartHeight;
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }
    }

    renderIndustryChart() {
        const canvas = document.getElementById('industryChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.dataManager.getData();
        const distribution = data.analytics.industryDistribution;

        if (Object.keys(distribution).length === 0) {
            ctx.fillStyle = 'var(--text-muted)';
            ctx.font = '16px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Simple bar chart
        const industries = Object.keys(distribution);
        const values = Object.values(distribution);
        const maxValue = Math.max(...values);
        
        const barWidth = (canvas.width - 40) / industries.length;
        const chartHeight = canvas.height - 60;

        industries.forEach((industry, index) => {
            const barHeight = (values[index] / maxValue) * chartHeight;
            const x = 20 + index * barWidth;
            const y = canvas.height - 40 - barHeight;

            // Draw bar
            ctx.fillStyle = `hsl(${index * 60}, 70%, 60%)`;
            ctx.fillRect(x, y, barWidth - 10, barHeight);

            // Draw label
            ctx.fillStyle = 'var(--text-secondary)';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(x + barWidth / 2, canvas.height - 10);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(industry.split(' ')[0], 0, 0);
            ctx.restore();
        });
    }

    // History Page Methods
    loadHistory() {
        this.filterHistory();
    }

    filterHistory() {
        const searchTerm = this.historySearch?.value || '';
        const sortBy = this.sortBy?.value || 'date';
        const riskFilter = this.filterRisk?.value || '';

        const filters = {
            search: searchTerm,
            sortBy: sortBy,
            riskLevel: riskFilter
        };

        const validations = this.dataManager.getValidations(filters);
        this.displayHistory(validations);
    }

    displayHistory(validations) {
        if (!this.historyList) return;

        if (validations.length === 0) {
            this.historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No Validations Found</h3>
                    <p>Try adjusting your search or filters</p>
                    <div class="quick-actions">
                        <a href="#" class="action-chip" onclick="app.switchToPage('dashboard')">
                            <i class="fas fa-plus"></i> Create New Validation
                        </a>
                        <a href="#" class="action-chip" onclick="app.clearFilters()">
                            <i class="fas fa-filter"></i> Clear Filters
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        this.historyList.innerHTML = '';

        validations.forEach((validation, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.style.animationDelay = `${index * 0.1}s`;
            historyItem.innerHTML = `
                <div class="history-header">
                    <div class="history-date">${new Date(validation.timestamp).toLocaleDateString()}</div>
                    <div class="history-actions">
                        <button class="btn-small btn-secondary" onclick="app.viewValidation('${validation.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn-small btn-secondary" onclick="app.duplicateValidation('${validation.id}')">
                            <i class="fas fa-copy"></i> Duplicate
                        </button>
                        <button class="btn-small btn-secondary" onclick="app.deleteValidation('${validation.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                <div class="history-scores">
                    <div class="history-score">
                        <div class="history-score-value">${validation.results.uniquenessScore}</div>
                        <div class="history-score-label">Uniqueness</div>
                    </div>
                    <div class="history-score">
                        <div class="history-score-value">${validation.results.commercialScore}</div>
                        <div class="history-score-label">Commercial</div>
                    </div>
                    <div class="history-score">
                        <div class="history-score-value">${validation.results.riskLevel}</div>
                        <div class="history-score-label">Risk</div>
                    </div>
                </div>
                <div class="history-idea">${validation.idea}</div>
                <div class="quick-actions">
                    <a href="#" class="action-chip" onclick="app.searchRelatedPapers('${validation.results.targetIndustries[0]}')">
                        <i class="fas fa-search"></i> Find Research
                    </a>
                    <a href="#" class="action-chip" onclick="app.compareValidations('${validation.id}')">
                        <i class="fas fa-balance-scale"></i> Compare
                    </a>
                </div>
            `;
            historyItem.classList.add('fade-in');
            this.historyList.appendChild(historyItem);
        });
    }

    clearFilters() {
        if (this.historySearch) this.historySearch.value = '';
        if (this.sortBy) this.sortBy.value = 'date';
        if (this.filterRisk) this.filterRisk.value = '';
        this.filterHistory();
    }

    duplicateValidation(id) {
        const data = this.dataManager.getData();
        const validation = data.validations.find(v => v.id === id);
        
        if (validation) {
            this.switchToPage('dashboard');
            setTimeout(() => {
                this.ideaInput.value = validation.idea;
                this.updateCharCounter();
                this.showNotification('Idea loaded for re-validation', 'success');
            }, 300);
        }
    }

    searchRelatedPapers(industry) {
        this.switchToPage('research');
        setTimeout(() => {
            this.researchQuery.value = industry;
            this.searchResearch();
        }, 300);
    }

    searchPaperByTitle(title) {
        this.switchToPage('research');
        setTimeout(() => {
            this.researchQuery.value = title;
            this.searchResearch();
        }, 300);
    }

    compareValidations(id) {
        // Future feature - for now just show notification
        this.showNotification('Comparison feature coming soon!', 'info');
    }

    viewValidation(id) {
        const data = this.dataManager.getData();
        const validation = data.validations.find(v => v.id === id);
        
        if (validation) {
            // Switch to dashboard and populate with the validation data
            this.switchToPage('dashboard');
            this.ideaInput.value = validation.idea;
            this.updateCharCounter();
            
            // Display the results
            setTimeout(() => {
                this.displayResults(validation.results);
            }, 300);
        }
    }

    deleteValidation(id) {
        if (confirm('Are you sure you want to delete this validation?')) {
            this.dataManager.deleteValidation(id);
            this.loadHistory();
            this.loadAnalytics();
            this.showNotification('Validation deleted successfully', 'success');
        }
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all validation history? This action cannot be undone.')) {
            this.dataManager.clearAllValidations();
            this.loadHistory();
            this.loadAnalytics();
            this.showNotification('History cleared successfully', 'success');
        }
    }

    exportReport() {
        this.dataManager.exportData();
        this.showNotification('Data exported successfully', 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const iconMap = {
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'success': 'check-circle',
            'info': 'info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${iconMap[type] || 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-md);
            padding: var(--spacing-md);
            color: var(--text-primary);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            max-width: 400px;
            box-shadow: var(--shadow-lg);
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Add notification animations to CSS
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);

// Initialize the application with error handling
let app;
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Check if required classes are available
        if (typeof DataManager === 'undefined') {
            console.error('DataManager class not found');
            return;
        }
        
        if (typeof ResearchDatabase === 'undefined') {
            console.error('ResearchDatabase class not found');
            return;
        }
        
        app = new ConceptForgeAI();
        
        // Check for test idea from test page
        const testIdea = localStorage.getItem('testIdea');
        if (testIdea && app.ideaInput) {
            app.ideaInput.value = testIdea;
            localStorage.removeItem('testIdea');
            
            // Update char counter and scroll to input
            app.updateCharCounter();
            setTimeout(() => {
                const inputSection = document.querySelector('.input-section');
                if (inputSection) {
                    inputSection.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);
        }
        
        console.log('ConceptForgeAI initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize ConceptForgeAI:', error);
        
        // Show user-friendly error message
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 2rem;
                color: white;
                text-align: center;
                z-index: 10000;
                max-width: 500px;
            ">
                <h2>⚠️ Loading Issue</h2>
                <p>There was a problem loading the application.</p>
                <p>Please try:</p>
                <ul style="text-align: left; margin: 1rem 0;">
                    <li>Refreshing the page</li>
                    <li>Opening <a href="simple.html" style="color: #00d4ff;">simple.html</a> for a working version</li>
                    <li>Opening <a href="debug.html" style="color: #00d4ff;">debug.html</a> to diagnose issues</li>
                </ul>
                <button onclick="window.location.reload()" style="
                    background: linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    cursor: pointer;
                    margin: 0.5rem;
                ">Refresh Page</button>
                <button onclick="window.open('simple.html', '_self')" style="
                    background: linear-gradient(135deg, #06ffa5 0%, #00d4ff 100%);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    cursor: pointer;
                    margin: 0.5rem;
                ">Use Simple Version</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
});