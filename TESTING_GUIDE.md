# Testing Guide - ConceptForgeAI

## Quick Links

- **Main Site**: http://conceptforge-website-live.s3-website-us-east-1.amazonaws.com
- **API Test Page**: http://conceptforge-website-live.s3-website-us-east-1.amazonaws.com/test-api.html
- **GitHub Repo**: https://github.com/akshaykun-05/ConceptForgeAI

## What Was Fixed

✅ Recommendations are now unique and contextual for each idea
✅ Research papers show real data from academic databases
✅ Related papers are dynamically generated based on idea keywords
✅ Better error handling and fallback logic

## Test Scenarios

### Scenario 1: AI-Related Idea
**Input**: "An AI-powered mobile app for personalized health tracking using machine learning"

**Expected Results**:
- Risks should include: "AI model training costs and computational resource requirements"
- Improvements should include: "Implement explainable AI features to build user trust"
- Related papers should include: "Machine Learning Applications", "Artificial Intelligence Systems"
- Industries: Technology & AI, Healthcare & Biotech

### Scenario 2: Healthcare Idea
**Input**: "A telemedicine platform connecting patients with doctors for remote consultations"

**Expected Results**:
- Risks should include: "Healthcare regulatory compliance (FDA, HIPAA) and approval timelines"
- Improvements should include: "Conduct clinical validation studies and establish medical advisory board"
- Related papers should include: "Digital Health Interventions", "Clinical Decision Support"
- Industries: Healthcare & Biotech

### Scenario 3: Finance/FinTech Idea
**Input**: "A blockchain-based platform for secure peer-to-peer financial transactions"

**Expected Results**:
- Risks should include: "Financial regulations, licensing requirements, and security compliance"
- Risks should include: "Cryptocurrency volatility and regulatory uncertainty"
- Improvements should include: "Obtain necessary financial licenses and establish banking partnerships"
- Related papers should include: "Financial Technology Innovation", "Distributed Ledger Technology"
- Industries: FinTech & Finance

### Scenario 4: Education Idea
**Input**: "An online learning platform with adaptive curriculum for K-12 students"

**Expected Results**:
- Risks should include: "Educational institution adoption cycles and curriculum integration challenges"
- Improvements should include: "Partner with educational institutions for pilot programs"
- Related papers should include: "Educational Technology", "Learning Analytics"
- Industries: Education & EdTech

### Scenario 5: E-commerce Idea
**Input**: "A marketplace platform connecting local artisans with global customers"

**Expected Results**:
- Improvements should include: "Optimize conversion funnel and implement personalization features"
- Related papers should include: "E-commerce Optimization", "Consumer Behavior"
- Industries: E-commerce & Retail

## Testing the Research Section

### Test 1: AI Research
1. Go to Research page
2. Search for: "machine learning artificial intelligence"
3. **Expected**: Real papers from arXiv with titles, authors, abstracts, and links

### Test 2: Healthcare Research
1. Go to Research page
2. Search for: "digital health telemedicine"
3. **Expected**: Papers from PubMed and arXiv related to healthcare

### Test 3: General Research
1. Go to Research page
2. Search for: "innovation technology"
3. **Expected**: Papers from multiple sources

### If Research Shows "Using local database"
This means:
- The research API is falling back to mock data
- This is expected behavior if the API has issues
- The main validation still works with dynamic recommendations

## Using the API Test Page

### Step 1: Open Test Page
Visit: http://conceptforge-website-live.s3-website-us-east-1.amazonaws.com/test-api.html

### Step 2: Test Single Validation
1. Enter an idea in the text area
2. Click "Test Validation API"
3. Check the JSON response for:
   - Unique risks based on keywords
   - Contextual improvements
   - Relevant related papers

### Step 3: Test Research API
1. Enter a research query
2. Click "Test Research API"
3. Check for real papers with:
   - Titles
   - Authors
   - Abstracts
   - DOIs/URLs
   - Source (arXiv, PubMed, etc.)

### Step 4: Run Multiple Tests
1. Click "Run Multiple Tests"
2. Watch as 4 different ideas are tested
3. Compare the results - each should have unique recommendations

## Verification Checklist

### Validation Results
- [ ] Different ideas get different risks
- [ ] Improvements are contextual to the idea
- [ ] Related papers match the idea's domain
- [ ] Scores vary based on idea content
- [ ] Industries are relevant to the idea

### Research Section
- [ ] Search returns results
- [ ] Papers have real titles and abstracts
- [ ] Papers have clickable links
- [ ] Source badges show (arXiv, PubMed, etc.)
- [ ] Research gaps are displayed

### User Experience
- [ ] No JavaScript errors in console
- [ ] Loading states work properly
- [ ] Notifications appear correctly
- [ ] Navigation between pages works
- [ ] History saves validations

## Common Issues and Solutions

### Issue: "Research search failed. Using local database"
**Solution**: This is expected fallback behavior. The validation still works with dynamic recommendations.

### Issue: All recommendations still look the same
**Solution**: 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Try different keywords (ai, health, finance, education)

### Issue: Validation takes a long time
**Solution**: This is normal - the Lambda function is processing the request. Wait 5-10 seconds.

### Issue: "Model use case details have not been submitted"
**Solution**: This is the Bedrock access issue. The fallback logic now provides dynamic recommendations instead of generic ones.

## Browser Console Debugging

Open browser console (F12) and check for:

### Good Signs:
```
API Endpoint: https://fsnpltvv61.execute-api.us-east-1.amazonaws.com/prod/validate
USE_MOCK_DATA: false
Calling real API...
API Response status: 200
```

### Expected Fallback:
```
Bedrock error: [error details]
Falling back to mock data
```
This is OK - the fallback now generates dynamic recommendations.

## Performance Expectations

- **Validation**: 3-10 seconds (depending on Bedrock availability)
- **Research**: 2-5 seconds (real APIs) or instant (local database)
- **Page Load**: < 2 seconds
- **Navigation**: Instant

## Success Criteria

✅ Each idea gets unique, contextual recommendations
✅ Research section shows real papers (or graceful fallback)
✅ No JavaScript errors in console
✅ All pages load and navigate properly
✅ Validation results are saved to history

## Need Help?

1. Check browser console for errors
2. Try the test-api.html page for detailed API testing
3. Review FIXES_APPLIED.md for technical details
4. Check TROUBLESHOOTING.md for common issues

## Next Steps After Testing

1. **If everything works**: Start using the platform for real idea validation
2. **If Bedrock access needed**: Submit use case form at AWS Bedrock console
3. **If DynamoDB needed**: Add permissions to Lambda role
4. **If research APIs need keys**: Add API keys to AWS Systems Manager Parameter Store

---

Last Updated: March 6, 2026
