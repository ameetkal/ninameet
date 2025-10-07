// Photo Flip Easter Egg
function initPhotoFlip() {
    const photoContainer = document.querySelector('.photo-container');
    const mainPhoto = document.getElementById('mainPhoto');
    if (!photoContainer || !mainPhoto) return;
    
    // Resolve correct relative path depending on current page (root vs /wedding/*)
    const basePrefix = window.location.pathname.includes('/wedding/') ? '../' : '';

    let isFlipped = false;
    
    photoContainer.addEventListener('click', function() {
        if (isFlipped) {
            mainPhoto.src = basePrefix + 'ninameet-photo.jpeg';
            isFlipped = false;
        } else {
            mainPhoto.src = basePrefix + 'ninameet-photo2.jpeg';
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
            mainPhoto.src = basePrefix + 'ninameet-photo.jpeg';
            isFlipped = false;
        } else {
            mainPhoto.src = basePrefix + 'ninameet-photo2.jpeg';
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

    // Only update countdown if elements exist (home page only)
    const daysElement = document.getElementById('days');
    const countdownElement = document.getElementById('countdown');
    
    if (daysElement) {
        daysElement.textContent = days;
    }

    if (countdownElement && distance < 0) {
        countdownElement.innerHTML = '<div class="countdown-item"><span class="countdown-number">🎉</span><span class="countdown-label">Today!</span></div>';
    }
}

// Update countdown every minute
setInterval(updateCountdown, 60000);
updateCountdown(); // Initial call

// Modal Functions
function showForm(responseType) {
    const modal = document.getElementById('formModal');
    const formTitle = document.getElementById('formTitle');
    
    // Clear all checkboxes first
    document.querySelectorAll('.attend-option').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    if (responseType === 'planning') {
        formTitle.textContent = "We're so excited!";
        // Select all events except "None"
        document.querySelectorAll('.attend-option:not(#opt-none)').forEach(checkbox => {
            checkbox.checked = true;
        });
    } else {
        formTitle.textContent = "We understand and will miss you!";
        // Select only "None" option
        document.getElementById('opt-none').checked = true;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeModal() {
    const modal = document.getElementById('formModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
    // Only reset the user-entered fields, not the response field
    document.getElementById('fullName').value = '';
    document.getElementById('email').value = '';
    document.getElementById('question').value = '';
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Form Submission
async function submitForm(event) {
    event.preventDefault();
    
    // Get form field values
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    // Collect attendance selections
    const selected = Array.from(document.querySelectorAll('.attend-option:checked')).map(
        (el) => el.value
    );
    const question = document.getElementById('question').value;
    
    const finalData = {
        fullName: fullName.trim(),
        email: email.trim(),
        attendanceSelections: selected,
        question: question.trim()
    };
    
    console.log('Submitting data to Firebase:', finalData);
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitButton.disabled = true;
    
    try {
        // Check if Firebase is available
        if (!window.firebaseDB) {
            throw new Error('Firebase not initialized. Please check your configuration.');
        }
        
        // Add document to Firestore
        const docRef = await window.firebaseAddDoc(
            window.firebaseCollection(window.firebaseDB, 'wedding-responses'),
            {
                ...finalData,
                timestamp: window.firebaseServerTimestamp(),
                createdAt: new Date().toISOString() // Fallback timestamp
            }
        );
        
        console.log('Document written with ID: ', docRef.id);
        
        // Store locally as backup
        const responses = JSON.parse(localStorage.getItem('weddingResponses') || '[]');
        responses.push({
            ...finalData,
            timestamp: new Date().toISOString(),
            firebaseId: docRef.id
        });
        localStorage.setItem('weddingResponses', JSON.stringify(responses));
        
        // Close form modal and show success
        closeModal();
        document.getElementById('successModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error adding document: ', error);
        
        // Store locally as backup on error
        const responses = JSON.parse(localStorage.getItem('weddingResponses') || '[]');
        responses.push({
            ...finalData,
            timestamp: new Date().toISOString(),
            status: 'failed',
            error: error.message
        });
        localStorage.setItem('weddingResponses', JSON.stringify(responses));
        
        // Show error message
        alert('Sorry, there was an error submitting your response. Your information has been saved locally and we\'ll try again later. Please contact us directly if this continues.');
    } finally {
        // Reset button state
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
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

// Wedding Navigation Functionality
function initWeddingNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (!navToggle || !navMenu) {
        return;
    }
    
    // Prevent duplicate initialization
    if (navToggle.hasAttribute('data-initialized')) {
        return;
    }
    navToggle.setAttribute('data-initialized', 'true');
    
    // Simple toggle function
    function toggleMenu() {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
    }
    
    // Remove any existing event listeners first
    navToggle.onclick = null;
    navToggle.ontouchstart = null;
    
    // Click event listener
    navToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
    });
    
    // Touch event listener for mobile
    navToggle.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
    }, { passive: false });
    
    // Close menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!navToggle.contains(event.target) && !navMenu.contains(event.target)) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        }
    });
}

// Schedule Day Toggle Function
function toggleDay(dayName) {
    const content = document.getElementById(dayName + '-content');
    const toggle = document.getElementById(dayName + '-toggle');
    
    if (content && toggle) {
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            content.classList.remove('expanded');
            toggle.classList.remove('expanded');
            toggle.textContent = '+';
        } else {
            content.classList.add('expanded');
            toggle.classList.add('expanded');
            toggle.textContent = '−';
        }
    }
}

// Travel Card Toggle Function
function toggleTravelCard(cardName) {
    const content = document.getElementById(cardName + '-content');
    const toggle = document.getElementById(cardName + '-toggle');
    
    if (content && toggle) {
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            content.classList.remove('expanded');
            toggle.classList.remove('expanded');
            toggle.textContent = '+';
        } else {
            content.classList.add('expanded');
            toggle.classList.add('expanded');
            toggle.textContent = '−';
        }
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initPhotoFlip();
    updateCountdown();
    setInterval(updateCountdown, 1000);
    initWeddingNavigation();
    initStorySlides();
}); 

// Story slides animations and navigation
function initStorySlides() {
    const container = document.getElementById('storyContainer');
    if (!container) return;

    // Mark container ready so CSS applies entrance animations
    container.classList.add('ready');

    const slides = container.querySelectorAll('.story-slide');

    // Ensure the first slide is visible immediately
    if (slides.length > 0) {
        slides[0].classList.add('is-visible');
    }

    // Intersection Observer to reveal slides
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { root: container, threshold: 0.4 });

    slides.forEach(slide => observer.observe(slide));

    // Keyboard navigation: up/down to snap to prev/next slide
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const current = Array.from(slides).findIndex(slide => {
            const rect = slide.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            return rect.top >= 0 && rect.top < viewportHeight * 0.5;
        });
        let targetIndex = current;
        if (e.key === 'ArrowDown') targetIndex = Math.min(slides.length - 1, current + 1);
        if (e.key === 'ArrowUp') targetIndex = Math.max(0, current - 1);
        slides[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Fallback: if IntersectionObserver doesn't trigger for any reason, reveal on first scroll
    let revealedOnScroll = false;
    container.addEventListener('scroll', () => {
        if (revealedOnScroll) return;
        revealedOnScroll = true;
        slides.forEach(slide => slide.classList.add('is-visible'));
    }, { passive: true });
}

// Registry Gift Selection Function
function selectGift(giftType) {
    let url = '';
    
    switch(giftType) {
        case 'honeymoon':
            url = 'https://withjoy.com/ninameet/registry?pid=1298cf42-915c-4975-b42d-dfe01049d54b';
            break;
        case 'home':
            url = 'https://withjoy.com/ninameet/registry?pid=a450ee97-8f93-4464-a345-ba44cd0f0c4b';
            break;
        case 'adventures':
            url = 'https://withjoy.com/ninameet/registry?pid=15e5083b-5d16-4831-8c26-54115b295a65';
            break;
    }
    
    if (url) {
        window.open(url, '_blank');
    }
}