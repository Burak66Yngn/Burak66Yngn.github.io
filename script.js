// Tennis Ball Animation
class TennisBall {
    constructor(canvas, x, y) {
        this.canvas = canvas;
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.velocity = Math.random() * 3 + 2; // Random falling speed
        this.gravity = 0.3;
        this.bounce = 0.7; // Bounce damping
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Tennis ball body
        const gradient = ctx.createRadialGradient(-5, -5, 5, 0, 0, this.radius);
        gradient.addColorStop(0, '#d4ff00');
        gradient.addColorStop(0.7, '#a8cc00');
        gradient.addColorStop(1, '#6a8000');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Tennis ball curves
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;

        // Left curve
        ctx.beginPath();
        ctx.arc(-this.radius * 0.3, 0, this.radius * 0.8, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();

        // Right curve
        ctx.beginPath();
        ctx.arc(this.radius * 0.3, 0, this.radius * 0.8, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();

        // Shadow effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, this.radius * 0.6, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        this.rotation += this.rotationSpeed;

        // Bounce on bottom
        if (this.y + this.radius > this.canvas.height) {
            this.y = this.canvas.height - this.radius;
            this.velocity *= -this.bounce;

            // Stop bouncing if velocity is too low
            if (Math.abs(this.velocity) < 0.5) {
                this.velocity = 0;
            }
        }
    }
}

// Animation Controller
class TennisAnimation {
    constructor() {
        this.overlay = document.getElementById('animation-overlay');
        this.canvas = document.getElementById('tennis-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.balls = [];
        this.animationComplete = false;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.init();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        // Create tennis balls at random positions
        const ballCount = Math.floor(Math.random() * 5) + 8; // 8-12 balls

        for (let i = 0; i < ballCount; i++) {
            setTimeout(() => {
                const x = Math.random() * (this.canvas.width - 80) + 40;
                const y = -50 - Math.random() * 100;
                this.balls.push(new TennisBall(this.canvas, x, y));
            }, i * 150); // Stagger ball creation
        }

        this.animate();

        // End animation after 5 seconds
        setTimeout(() => {
            this.endAnimation();
        }, 4500); // Reduced by 10%
    }

    animate() {
        if (this.animationComplete) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.balls.forEach(ball => {
            ball.update();
            ball.draw(this.ctx);
        });

        requestAnimationFrame(() => this.animate());
    }

    endAnimation() {
        this.animationComplete = true;
        this.overlay.classList.add('hidden');

        // Remove overlay from DOM after transition
        setTimeout(() => {
            this.overlay.style.display = 'none';
        }, 500);
    }
}

// Initialize animation when page loads
window.addEventListener('load', () => {
    new TennisAnimation();
});

// Smooth scrolling for navigation links
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

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections
document.addEventListener('DOMContentLoaded', () => {
    // Add animation classes to sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });

    // Animate skill bars when visible
    const skillBars = document.querySelectorAll('.skill-progress');
    const skillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const width = entry.target.style.width;
                entry.target.style.width = '0';
                setTimeout(() => {
                    entry.target.style.width = width;
                }, 100);
                skillObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    skillBars.forEach(bar => skillObserver.observe(bar));
});

// Navbar scroll effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        navbar.style.background = 'rgba(10, 10, 15, 0.95)';
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    } else {
        navbar.style.background = 'rgba(10, 10, 15, 0.8)';
        navbar.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// Form submission handler
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Mesajınız için teşekkürler! En kısa sürede size dönüş yapacağım.');
        contactForm.reset();
    });
}

// Add parallax effect to hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero-content');
    if (hero && scrolled < window.innerHeight) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        hero.style.opacity = 1 - (scrolled / window.innerHeight);
    }
});
