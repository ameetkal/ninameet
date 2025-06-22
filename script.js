// Wedding date - June 19, 2026 (start of the wedding celebration)
const weddingDate = new Date('June 19, 2026 00:00:00').getTime();

// Countdown Timer
function updateCountdown() {
    const now = new Date().getTime();
    const distance = weddingDate - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));

    document.getElementById('days').textContent = days;
    document.getElementById('hours').textContent = '00';
    document.getElementById('minutes').textContent = '00';

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
        formTitle.textContent = "We're so excited you're planning to come!";
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
    
    // For now, we'll just log the data and show success
    // Later, you can integrate with a backend service
    console.log('Form submission:', data);
    
    // Store in localStorage for now (you can replace this with actual backend)
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