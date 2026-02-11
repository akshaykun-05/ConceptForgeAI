# ConceptForgeAI - Troubleshooting Guide

## 🚨 **Quick Fixes**

### **Site Not Working? Try These:**

1. **🔄 Refresh the Page**: Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

2. **📱 Use Simple Version**: Open `simple.html` - this is guaranteed to work

3. **🔍 Debug Issues**: Open `debug.html` to see what's wrong

4. **🧪 Test Samples**: Open `test.html` for sample ideas

---

## 🔧 **Common Issues & Solutions**

### **Issue 1: JavaScript Errors**
**Symptoms**: Page loads but buttons don't work, console shows errors

**Solutions**:
```html
<!-- Check if all files are loading -->
1. Open browser developer tools (F12)
2. Check Console tab for errors
3. Check Network tab for failed file loads
4. Ensure all files are in the same directory:
   - index.html
   - config.js
   - data-manager.js
   - script.js
   - styles.css
```

### **Issue 2: Missing Elements**
**Symptoms**: "Element not found" errors in console

**Solutions**:
1. **Use Simple Version**: `simple.html` has all elements in one file
2. **Check HTML Structure**: Ensure all required IDs exist
3. **Wait for DOM**: JavaScript runs after page loads

### **Issue 3: Styles Not Loading**
**Symptoms**: Page looks broken, no dark theme

**Solutions**:
```css
/* Check if styles.css is loading */
1. Open Network tab in developer tools
2. Look for styles.css - should be 200 status
3. If 404 error, check file path
4. Try hard refresh: Ctrl+Shift+R
```

### **Issue 4: Fonts/Icons Not Loading**
**Symptoms**: Missing icons, default fonts

**Solutions**:
```html
<!-- Check internet connection for CDN resources -->
1. Ensure internet connection for:
   - Google Fonts
   - Font Awesome icons
2. If offline, fonts will fallback to system fonts
3. Icons may show as squares - this is normal offline
```

---

## 📁 **File Structure Check**

Your directory should look like this:
```
conceptforge-ai/
├── index.html          ✅ Main application
├── simple.html         ✅ Simplified working version
├── debug.html          ✅ Debug and testing page
├── test.html           ✅ Sample ideas for testing
├── config.js           ✅ Configuration settings
├── data-manager.js     ✅ Data management system
├── script.js           ✅ Main application logic
├── styles.css          ✅ Styling and theme
├── lambda/             📁 AWS Lambda functions
├── deploy.bat          🚀 Windows deployment
├── setup.bat           🔧 Windows setup
└── README.md           📖 Documentation
```

---

## 🌐 **Browser Compatibility**

### **Supported Browsers**:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### **Known Issues**:
- ❌ Internet Explorer (not supported)
- ⚠️ Chrome < 90 (limited CSS support)
- ⚠️ Safari < 14 (backdrop-filter issues)

---

## 🔍 **Step-by-Step Debugging**

### **Step 1: Basic Functionality Test**
```javascript
// Open browser console (F12) and run:
console.log('Testing basic functionality...');

// Check if elements exist
console.log('ideaInput:', document.getElementById('ideaInput'));
console.log('validateBtn:', document.getElementById('validateBtn'));

// Check if classes are loaded
console.log('DataManager:', typeof DataManager);
console.log('ConceptForgeAI:', typeof ConceptForgeAI);
```

### **Step 2: File Loading Test**
```javascript
// Check if all files loaded
fetch('config.js').then(r => console.log('config.js:', r.status));
fetch('data-manager.js').then(r => console.log('data-manager.js:', r.status));
fetch('script.js').then(r => console.log('script.js:', r.status));
fetch('styles.css').then(r => console.log('styles.css:', r.status));
```

### **Step 3: Manual Validation Test**
```javascript
// Test validation manually
const testIdea = "A mobile app that helps people find restaurants";
console.log('Testing with:', testIdea);

// This should work if everything is loaded correctly
if (typeof app !== 'undefined' && app.generateEnhancedMockValidation) {
    const result = app.generateEnhancedMockValidation(testIdea);
    console.log('Validation result:', result);
} else {
    console.error('App not initialized properly');
}
```

---

## 🚀 **Working Versions**

### **1. Simple Version (`simple.html`)**
- ✅ **Guaranteed to work**
- ✅ All code in one file
- ✅ No external dependencies
- ✅ Full validation functionality
- ❌ Limited to dashboard only

### **2. Debug Version (`debug.html`)**
- ✅ Shows loading status
- ✅ Displays error messages
- ✅ Tests file availability
- ✅ Provides quick fixes

### **3. Test Version (`test.html`)**
- ✅ Sample ideas to test
- ✅ Works independently
- ✅ Links to main app
- ✅ Good for demonstrations

---

## 🔧 **Local Development Setup**

### **Option 1: Simple File Server**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have it)
npx serve .

# Then open: http://localhost:8000
```

### **Option 2: VS Code Live Server**
1. Install "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

### **Option 3: Direct File Access**
- Just double-click `simple.html`
- This works without any server

---

## 📱 **Mobile Issues**

### **Common Mobile Problems**:
1. **Touch Events**: Some buttons may not respond
2. **Viewport**: Text might be too small
3. **Performance**: Slower on older devices

### **Mobile Solutions**:
```html
<!-- Add to <head> if missing -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="mobile-web-app-capable" content="yes">
```

---

## 🌐 **Deployment Issues**

### **Local vs Deployed Differences**:
1. **File Paths**: Relative paths work locally but may fail deployed
2. **CORS**: API calls work locally but blocked when deployed
3. **HTTPS**: Some features require HTTPS in production

### **Quick Deploy Test**:
```bash
# Test if files are accessible
curl -I https://your-domain.com/index.html
curl -I https://your-domain.com/config.js
curl -I https://your-domain.com/styles.css
```

---

## 🆘 **Emergency Fixes**

### **If Nothing Works**:

1. **Use Simple Version**:
   ```html
   <!-- Copy simple.html content to index.html -->
   <!-- This guarantees a working application -->
   ```

2. **Reset Configuration**:
   ```javascript
   // In config.js, reset to basics:
   const CONFIG = {
       USE_MOCK_DATA: true,
       MAX_IDEA_LENGTH: 2000,
       MIN_IDEA_LENGTH: 10
   };
   ```

3. **Clear Browser Cache**:
   - Chrome: Ctrl+Shift+Delete
   - Firefox: Ctrl+Shift+Delete
   - Safari: Cmd+Option+E

4. **Try Different Browser**:
   - Chrome (recommended)
   - Firefox (good alternative)
   - Edge (Windows users)

---

## 📞 **Getting Help**

### **Self-Diagnosis Checklist**:
- [ ] Tried refreshing the page
- [ ] Checked browser console for errors
- [ ] Tested with `simple.html`
- [ ] Verified all files are present
- [ ] Tried different browser
- [ ] Cleared browser cache

### **Information to Provide**:
1. **Browser & Version**: Chrome 120, Firefox 115, etc.
2. **Operating System**: Windows 11, macOS 14, etc.
3. **Error Messages**: Copy exact error from console
4. **Steps to Reproduce**: What you clicked/typed
5. **Expected vs Actual**: What should happen vs what happens

### **Quick Test Results**:
```javascript
// Run this in console and share results:
console.log({
    browser: navigator.userAgent,
    screen: screen.width + 'x' + screen.height,
    files: {
        config: typeof CONFIG,
        dataManager: typeof DataManager,
        app: typeof app
    },
    elements: {
        ideaInput: !!document.getElementById('ideaInput'),
        validateBtn: !!document.getElementById('validateBtn')
    }
});
```

---

## ✅ **Success Indicators**

### **Everything Working Correctly**:
- ✅ Page loads with dark theme
- ✅ ConceptForgeAI logo visible
- ✅ Navigation menu works
- ✅ Text area accepts input
- ✅ Character counter updates
- ✅ Validate button responds
- ✅ Results appear after validation
- ✅ No console errors

### **Partial Functionality**:
- ⚠️ Basic validation works but some features missing
- ⚠️ Styles load but some elements broken
- ⚠️ JavaScript works but API calls fail

### **Complete Failure**:
- ❌ Blank page or error messages
- ❌ No styling (looks like plain HTML)
- ❌ Buttons don't respond
- ❌ Console full of errors

---

## 🎯 **Quick Solutions Summary**

| Problem | Quick Fix |
|---------|-----------|
| Site won't load | Use `simple.html` |
| JavaScript errors | Check `debug.html` |
| Missing styles | Hard refresh (Ctrl+Shift+R) |
| Buttons don't work | Try different browser |
| Mobile issues | Use desktop browser |
| API errors | Ensure `USE_MOCK_DATA: true` |

**Remember: `simple.html` always works and provides full validation functionality!** 🚀