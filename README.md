# Nina & Ameet - Save the Date Website

A beautiful, responsive save the date website for Nina and Ameet's wedding celebration in Marseille, France.

## Features

- ✨ **Elegant Design**: Modern, responsive design with beautiful gradients and typography
- 📱 **Mobile-First**: Fully responsive design that looks great on all devices
- ⏰ **Countdown Timer**: Live countdown to the wedding date
- 📝 **Simple RSVP**: Easy form for guests to indicate their plans
- 🎨 **Smooth Animations**: Subtle animations and transitions
- 📊 **Data Collection**: Stores responses locally (ready for backend integration)

## Quick Start

### Option 1: Simple Local Server
```bash
# Using Python (if you have Python installed)
python -m http.server 8000

# Using Node.js (if you have Node.js installed)
npx serve .

# Using PHP (if you have PHP installed)
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

### Option 2: Live Server (VS Code Extension)
If you're using VS Code, install the "Live Server" extension and right-click on `index.html` to "Open with Live Server".

## File Structure

```
ninameet/
├── index.html          # Main HTML file
├── styles.css          # All styling
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Customization

### Update Wedding Details
Edit the following in `index.html`:
- Wedding date and time
- Location
- Couple names
- Any text content

### Update Wedding Date
In `script.js`, line 2:
```javascript
const weddingDate = new Date('June 19, 2025 16:00:00').getTime();
```

### Add Couple Photo
Replace the placeholder in the HTML:
```html
<div class="photo-placeholder">
    <img src="path/to/your/photo.jpg" alt="Nina & Ameet" style="width: 100%; border-radius: 15px;">
</div>
```

### Change Colors
The main color scheme is defined in `styles.css`. Look for:
- Primary gradient: `#667eea` to `#764ba2`
- Accent color: `#ffd700` (gold)
- Background: Various gradients

## Form Data

Currently, form submissions are stored in the browser's localStorage. To view responses:

1. Open browser developer tools (F12)
2. Go to Application/Storage tab
3. Look for "weddingResponses" in localStorage

## Future Enhancements

### Backend Integration
To store responses in a database, replace the form submission logic in `script.js`:

```javascript
// Replace the localStorage code with an API call
fetch('/api/rsvp', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
})
.then(response => response.json())
.then(result => {
    // Handle success
});
```

### Email Notifications
Add email notifications when someone submits a response using services like:
- EmailJS
- Formspree
- Netlify Forms
- Custom backend with nodemailer

### Additional Features
- Photo gallery
- Wedding details page
- Travel information
- Accommodation recommendations
- Gift registry links

## Deployment

### Netlify (Recommended)
1. Push your code to GitHub
2. Connect your repository to Netlify
3. Deploy automatically

### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory

### GitHub Pages
1. Push to GitHub
2. Enable GitHub Pages in repository settings
3. Select source branch

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

This project is for personal use. Feel free to modify and use for your own wedding!

---

**Made with ❤️ for Nina & Ameet's special day** 