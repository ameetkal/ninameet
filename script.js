// Photo Flip Easter Egg
function initPhotoFlip() {
    const photoContainer = document.querySelector('.photo-container');
    const mainPhoto = document.getElementById('mainPhoto');
    if (!photoContainer || !mainPhoto) return;
    
    let isFlipped = false;
    
    photoContainer.addEventListener('click', function() {
        if (isFlipped) {
            mainPhoto.src = 'ninameet-photo.jpeg';
            isFlipped = false;
        } else {
            mainPhoto.src = 'ninameet-photo2.jpeg';
            isFlipped = true;
        }
        
        // Optional: Add a subtle sound effect or haptic feedback
        // For mobile devices
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    });
    
    // Add touch support for mobile
    photoContainer.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (isFlipped) {
            mainPhoto.src = 'ninameet-photo.jpeg';
            isFlipped = false;
        } else {
            mainPhoto.src = 'ninameet-photo2.jpeg';
            isFlipped = true;
        }
        
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    });
}

// Wedding date - June 19, 2026 (start of the wedding celebration)
const weddingDate = new Date('June 19, 2026 00:00:00').getTime();

// Countdown Timer
function updateCountdown() {
    const now = new Date().getTime();
    const distance = weddingDate - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));

    document.getElementById('days').textContent = days;

    if (distance < 0) {
        document.getElementById('countdown').innerHTML = '<div class="countdown-item"><span class="countdown-number">🎉</span><span class="countdown-label">Today!</span></div>';
    }
}

// Update countdown every minute
setInterval(updateCountdown, 60000);
updateCountdown(); // Initial call

// Modal Functions
function showForm(responseType) {
    const modal = document.getElementById('formModal');
    const responseField = document.getElementById('response');
    const formTitle = document.getElementById('formTitle');
    
    if (responseType === 'planning') {
        responseField.value = 'Planning to come!';
        formTitle.textContent = "We're so excited!";
    } else {
        responseField.value = "Can't make it";
        formTitle.textContent = "We understand and will miss you!";
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeModal() {
    const modal = document.getElementById('formModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
    document.getElementById('rsvpForm').reset();
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Form Submission
function submitForm(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    console.log('Submitting form data:', data);
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitButton.disabled = true;
    
    // Send to Google Sheets using iframe method (more reliable)
    console.log('Sending to Google Sheets...');
    
    // Create a form to submit via iframe
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://script.google.com/macros/s/AKfycbwanxKRHcCm3S-sfUWj0k-Gpzf0tfYeNFIpXQsJ8HpxwkNTXaPb-0STYOjr-xc5iOd4lA/exec';
    form.target = 'hidden-iframe';
    form.style.display = 'none';
    
    // Add form fields
    Object.keys(data).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = data[key];
        form.appendChild(input);
    });
    
    // Create or get the hidden iframe
    let iframe = document.getElementById('hidden-iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'hidden-iframe';
        iframe.name = 'hidden-iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }
    
    // Handle iframe load (success/error)
    iframe.onload = function() {
        console.log('Form submitted successfully');
        
        // Store locally as backup
        const responses = JSON.parse(localStorage.getItem('weddingResponses') || '[]');
        responses.push({
            ...data,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('weddingResponses', JSON.stringify(responses));
        
        // Close form modal and show success
        closeModal();
        document.getElementById('successModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Reset button state
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
        
        // Clean up
        document.body.removeChild(form);
    };
    
    // Submit the form
    document.body.appendChild(form);
    form.submit();
}

// Close modals when clicking outside
window.onclick = function(event) {
    const formModal = document.getElementById('formModal');
    const successModal = document.getElementById('successModal');
    
    if (event.target === formModal) {
        closeModal();
    }
    if (event.target === successModal) {
        closeSuccessModal();
    }
}

// Close modals with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
        closeSuccessModal();
    }
});

// Smooth scrolling for anchor links (if any)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add some nice animations on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize background animations
    createFloatingElements();
    initCanvas();
    initPhotoFlip();
    
    // Animate elements on load
    const animatedElements = document.querySelectorAll('.hero-content > *, .purpose-content > *, .button-group > *');
    
    animatedElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 100);
    });
});

// Optional: Add confetti effect for fun (you can remove this if not wanted)
function createConfetti() {
    const colors = ['#667eea', '#764ba2', '#ffd700', '#e74c3c', '#27ae60'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.borderRadius = '50%';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '9999';
        confetti.style.animation = `fall ${Math.random() * 3 + 2}s linear forwards`;
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

// Add confetti CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fall {
        to {
            transform: translateY(100vh) rotate(360deg);
        }
    }
`;
document.head.appendChild(style);

// Optional: Trigger confetti on form submission (you can remove this)
// Uncomment the line below if you want confetti when someone submits the form
// document.getElementById('rsvpForm').addEventListener('submit', createConfetti); 

// Background Animations
function createFloatingElements() {
    const container = document.getElementById('floatingElements');
    const weddingEmojis = ['💍', '💕', '🥂', '✨', '💒', '🌹'];
    const colors = ['#fbbf24', '#059669', '#f59e0b', '#10b981'];
    
    // Create floating emojis
    function createEmoji() {
        const emoji = document.createElement('div');
        emoji.className = 'floating-element';
        emoji.textContent = weddingEmojis[Math.floor(Math.random() * weddingEmojis.length)];
        emoji.style.left = Math.random() * 100 + 'vw';
        emoji.style.animationDelay = Math.random() * 8 + 's';
        emoji.style.animationDuration = (Math.random() * 4 + 6) + 's';
        container.appendChild(emoji);
        
        // Remove emoji after animation
        setTimeout(() => {
            if (emoji.parentNode) {
                emoji.parentNode.removeChild(emoji);
            }
        }, 10000);
    }
    
    // Create sparkles
    function createSparkle() {
        const sparkle = document.createElement('div');
        sparkle.className = 'floating-sparkle';
        sparkle.style.left = Math.random() * 100 + 'vw';
        sparkle.style.top = Math.random() * 100 + 'vh';
        sparkle.style.animationDelay = Math.random() * 6 + 's';
        sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
        container.appendChild(sparkle);
        
        // Remove sparkle after animation
        setTimeout(() => {
            if (sparkle.parentNode) {
                sparkle.parentNode.removeChild(sparkle);
            }
        }, 8000);
    }
    
    // Create initial elements
    for (let i = 0; i < 8; i++) {
        setTimeout(() => createEmoji(), i * 1000);
    }
    
    for (let i = 0; i < 15; i++) {
        setTimeout(() => createSparkle(), i * 500);
    }
    
    // Continue creating elements
    setInterval(createEmoji, 3000);
    setInterval(createSparkle, 2000);
}

// Canvas Particle System
function initCanvas() {
    const canvas = document.getElementById('backgroundCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Particle class
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2 + 1;
            this.opacity = Math.random() * 0.5 + 0.2;
            this.color = ['#fbbf24', '#059669', '#f59e0b'][Math.floor(Math.random() * 3)];
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
        
        draw() {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    // Create particles
    const particles = [];
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle());
    }
    
    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
} 