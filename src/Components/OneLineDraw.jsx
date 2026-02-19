import React, { useState, useRef, useEffect } from 'react';

export default function OneLineDraw() {
    const canvasRef = useRef(null);
    const bgCanvasRef = useRef(null);
    const [currentLevel, setCurrentLevel] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('oneline_currentLevel');
            return saved ? parseInt(saved) : 0;
        }
        return 0;
    });
    const [gameState, setGameState] = useState('playing'); // 'playing' or 'levelSelect'
    const [drawnPath, setDrawnPath] = useState([]);
    const [currentPos, setCurrentPos] = useState(null);
    const [drawing, setDrawing] = useState(false);
    const [lives, setLives] = useState(3);
    const [edgesDrawn, setEdgesDrawn] = useState(new Set());
    const [message, setMessage] = useState({ text: '', type: '' });
    const [isWinAnimating, setIsWinAnimating] = useState(false);// 16-02 -- winanimation//
    const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('oneline_maxLevel');
            return saved ? parseInt(saved) : 0;
        }
        return 0;
    }); // Persistence added via localStorage
    const [bgParticles, setBgParticles] = useState([]);
    const bgAnimRef = useRef(null);
    const particlesRef = useRef([]);
    const timeRef = useRef(0);

    const [dimensions, setDimensions] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 800,
        height: typeof window !== 'undefined' ? window.innerHeight : 600
    });

    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Save progress to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('oneline_maxLevel', maxUnlockedLevel.toString());
            localStorage.setItem('oneline_currentLevel', currentLevel.toString());
        }
    }, [maxUnlockedLevel, currentLevel]);

    const { width: WIDTH, height: HEIGHT } = dimensions;
    const isMobile = WIDTH < 600;
    const isMobileDevice = Math.min(WIDTH, HEIGHT) < 600;
    const isSmallMobile = WIDTH < 400;
    const isLandscape = WIDTH > HEIGHT && HEIGHT < 500;
    const isTabletPortrait = !isMobile && HEIGHT > WIDTH && WIDTH >= 600 && WIDTH <= 1024;
    const isTabletLandscape = !isMobile && WIDTH > HEIGHT && WIDTH <= 1440 && HEIGHT >= 500;
    const isTablet = isTabletPortrait || isTabletLandscape;
    const G_SCALE = isMobile ? Math.min(1, (isLandscape ? HEIGHT / 400 : WIDTH / 500)) : 1;

    // Initialize background particles
    useEffect(() => {
        const count = isMobile ? 40 : 70;
        const particles = Array.from({ length: count }, (_, i) => ({
            id: i,
            x: Math.random() * WIDTH,
            y: Math.random() * HEIGHT,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: Math.random() * 3 + 1,
            opacity: Math.random() * 0.5 + 0.1,
            pulse: Math.random() * Math.PI * 2,
            connected: [],
        }));
        particlesRef.current = particles;
    }, [WIDTH, HEIGHT]);


    /* CANVAS BACKGROUND */
    useEffect(() => {
        const bgCanvas = bgCanvasRef.current;
        if (!bgCanvas) return;
        const ctx = bgCanvas.getContext('2d');

        const animate = () => {
            timeRef.current += 0.008;
            const t = timeRef.current;
            ctx.clearRect(0, 0, WIDTH, HEIGHT);

            // Deep cosmic gradient background
            const grad = ctx.createRadialGradient(WIDTH * 0.4, HEIGHT * 0.3, 0, WIDTH * 0.5, HEIGHT * 0.5, WIDTH * 0.9);
            grad.addColorStop(0, '#0a0a1a');
            grad.addColorStop(0.4, '#0d0d2b');
            grad.addColorStop(0.7, '#0a0f20');
            grad.addColorStop(1, '#060610');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            // Nebula blobs
            const blobs = [
                { x: WIDTH * 0.2, y: HEIGHT * 0.3, r: WIDTH * 0.35, c1: 'rgba(118,75,162,0.07)', c2: 'rgba(0,0,0,0)' },
                { x: WIDTH * 0.8, y: HEIGHT * 0.7, r: WIDTH * 0.4, c1: 'rgba(29,161,242,0.06)', c2: 'rgba(0,0,0,0)' },
                { x: WIDTH * 0.5, y: HEIGHT * 0.1, r: WIDTH * 0.3, c1: 'rgba(255,100,100,0.04)', c2: 'rgba(0,0,0,0)' },
            ];
            blobs.forEach(b => {
                const px = b.x + Math.sin(t * 0.3) * 20;
                const py = b.y + Math.cos(t * 0.2) * 15;
                const gr = ctx.createRadialGradient(px, py, 0, px, py, b.r);
                gr.addColorStop(0, b.c1);
                gr.addColorStop(1, b.c2);
                ctx.fillStyle = gr;
                ctx.fillRect(0, 0, WIDTH, HEIGHT);
            });

            // Grid overlay
            ctx.strokeStyle = 'rgba(100,120,180,0.06)';
            ctx.lineWidth = 0.5;
            const gs = 50;
            for (let x = 0; x <= WIDTH; x += gs) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
            }
            for (let y = 0; y <= HEIGHT; y += gs) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
            }

            // Update & draw particles
            const parts = particlesRef.current;
            parts.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.pulse += 0.02;
                if (p.x < 0 || p.x > WIDTH) p.vx *= -1;
                if (p.y < 0 || p.y > HEIGHT) p.vy *= -1;
            });

            // Draw connections between nearby particles
            for (let i = 0; i < parts.length; i++) {
                for (let j = i + 1; j < parts.length; j++) {
                    const dx = parts[i].x - parts[j].x;
                    const dy = parts[i].y - parts[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = isMobile ? 80 : 120;
                    if (dist < maxDist) {
                        const alpha = (1 - dist / maxDist) * 0.25;
                        ctx.strokeStyle = `rgba(150,180,255,${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(parts[i].x, parts[i].y);
                        ctx.lineTo(parts[j].x, parts[j].y);
                        ctx.stroke();
                    }
                }
            }


            // Draw particles
            parts.forEach(p => {
                const pulse = (Math.sin(p.pulse) * 0.5 + 0.5) * 0.4 + 0.1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * (0.8 + Math.sin(p.pulse) * 0.2), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(180,200,255,${pulse})`;
                ctx.fill();

                // Glow
                const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
                glow.addColorStop(0, `rgba(100,160,255,${pulse * 0.5})`);
                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
                ctx.fill();
            });

            bgAnimRef.current = requestAnimationFrame(animate);
        };

        bgAnimRef.current = requestAnimationFrame(animate);
        return () => { if (bgAnimRef.current) cancelAnimationFrame(bgAnimRef.current); };
    }, [WIDTH, HEIGHT, isMobile]);

    /*ALL LEVELS*/
    const levels = [
        {
            name: 'LEVEL 1',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.25 },
                { id: 1, x: WIDTH / 2 - 130 * G_SCALE, y: HEIGHT * 0.75 },
                { id: 2, x: WIDTH / 2 + 130 * G_SCALE, y: HEIGHT * 0.75 }
            ],
            targetEdges: [
                [0, 1], [1, 2], [2, 0]
            ]
        },

        {
            name: 'LEVEL 2',
            nodes: [
                { id: 0, x: WIDTH / 2 - 140 * G_SCALE, y: HEIGHT * 0.3 },
                { id: 1, x: WIDTH / 2 + 140 * G_SCALE, y: HEIGHT * 0.3 },
                { id: 2, x: WIDTH / 2 - 140 * G_SCALE, y: HEIGHT * 0.7 },
                { id: 3, x: WIDTH / 2 + 140 * G_SCALE, y: HEIGHT * 0.7 }
            ],
            targetEdges: [
                [0, 1], [1, 3], [3, 2], [2, 0]
            ]
        },

        {
            name: 'LEVEL 3',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.25 },
                { id: 1, x: WIDTH / 2 - 140 * G_SCALE, y: HEIGHT * 0.55 },
                { id: 2, x: WIDTH / 2 + 140 * G_SCALE, y: HEIGHT * 0.55 },
                { id: 3, x: WIDTH / 2, y: HEIGHT * 0.75 }
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 3], [2, 3]
            ]
        },

        {
            name: 'LEVEL 4',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.2 },
                { id: 1, x: WIDTH / 2 - 150 * G_SCALE, y: HEIGHT * 0.4 },
                { id: 2, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.4 },
                { id: 3, x: WIDTH / 2 - 150 * G_SCALE, y: HEIGHT * 0.75 },
                { id: 4, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.75 }
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4]
            ]
        },

        {
            name: 'LEVEL 5',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.2 },
                { id: 1, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.55 },
                { id: 2, x: WIDTH / 2, y: HEIGHT * 0.55 },
                { id: 3, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.55 },
                { id: 4, x: WIDTH / 2, y: HEIGHT * 0.8 }
            ],
            targetEdges: [
                [0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4]
            ]
        },

        {
            name: 'LEVEL 6',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.15 },
                { id: 1, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.4 },
                { id: 2, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.4 },
                { id: 3, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.8 },
                { id: 4, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.8 },
                { id: 5, x: WIDTH / 2, y: HEIGHT * 0.6 }
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [1, 5], [2, 5]
            ]
        },

        {
            name: 'LEVEL 7',
            nodes: [
                { id: 0, x: WIDTH / 2 - 150 * G_SCALE, y: HEIGHT * 0.3 },
                { id: 1, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.3 },
                { id: 2, x: WIDTH / 2, y: HEIGHT * 0.55 },
                { id: 3, x: WIDTH / 2 - 150 * G_SCALE, y: HEIGHT * 0.7 },
                { id: 4, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.7 }
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 2], [2, 3], [2, 4]
            ]
        },

        {
            name: 'LEVEL 8',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.2 },
                { id: 1, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.55 },
                { id: 2, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.55 },
                { id: 3, x: WIDTH / 2, y: HEIGHT * 0.8 }
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 3], [2, 3], [1, 2]
            ]
        },

        {
            name: 'LEVEL 9',
            nodes: [
                { id: 0, x: WIDTH / 2 - 130 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 1, x: WIDTH / 2 + 130 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 2, x: WIDTH / 2 - 130 * G_SCALE, y: HEIGHT * 0.65 },
                { id: 3, x: WIDTH / 2 + 130 * G_SCALE, y: HEIGHT * 0.65 },
                { id: 4, x: WIDTH / 2, y: HEIGHT * 0.75 }
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 3], [2, 4], [3, 4]
            ]
        },

        {
            name: 'LEVEL 10',
            nodes: [
                { id: 0, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 1, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 2, x: WIDTH / 2, y: HEIGHT * 0.55 },
                { id: 3, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.75 },
                { id: 4, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.75 }
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4]
            ]
        },

        {
            name: 'LEVEL 11',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.2 },
                { id: 1, x: WIDTH / 2 - 150 * G_SCALE, y: HEIGHT * 0.4 },
                { id: 2, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.4 },
                { id: 3, x: WIDTH / 2 - 190 * G_SCALE, y: HEIGHT * 0.7 },
                { id: 4, x: WIDTH / 2 + 190 * G_SCALE, y: HEIGHT * 0.7 },
                { id: 5, x: WIDTH / 2, y: HEIGHT * 0.9 }
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [0, 5], [1, 5], [2, 5]
            ]
        },

        {
            name: 'LEVEL 12',
            nodes: [
                { id: 0, x: WIDTH / 2 - 180 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 1, x: WIDTH / 2 - 180 * G_SCALE, y: HEIGHT * 0.55 },
                { id: 2, x: WIDTH / 2 - 180 * G_SCALE, y: HEIGHT * 0.75 },
                { id: 3, x: WIDTH / 2, y: HEIGHT * 0.25 },
                { id: 4, x: WIDTH / 2, y: HEIGHT * 0.55 },
                { id: 5, x: WIDTH / 2, y: HEIGHT * 0.75 },
                { id: 6, x: WIDTH / 2 + 180 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 7, x: WIDTH / 2 + 180 * G_SCALE, y: HEIGHT * 0.75 }
            ],
            targetEdges: [
                [0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5], [6, 7], [4, 6], [4, 7]
            ]
        },

        {
            name: 'LEVEL 13',
            nodes: [
                { id: 0, x: WIDTH / 2 - 170 * G_SCALE, y: HEIGHT * 0.45 },
                { id: 1, x: WIDTH / 2 - 170 * G_SCALE, y: HEIGHT * 0.75 },
                { id: 2, x: WIDTH / 2 - 70 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 3, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 4, x: WIDTH / 2 + 10 * G_SCALE, y: HEIGHT * 0.45 },
                { id: 5, x: WIDTH / 2 + 10 * G_SCALE, y: HEIGHT * 0.75 },
                { id: 6, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.6 }
            ],
            targetEdges: [
                [0, 1], [2, 3], [0, 2], [0, 4], [4, 5], [1, 5], [0, 5], [3, 6], [6, 5], [4, 3]
            ]
        },

        {
            name: 'LEVEL 14',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.2 },
                { id: 1, x: WIDTH / 2 - 170 * G_SCALE, y: HEIGHT * 0.4 },
                { id: 2, x: WIDTH / 2 - 170 * G_SCALE, y: HEIGHT * 0.65 },
                { id: 3, x: WIDTH / 2 - 170 * G_SCALE, y: HEIGHT * 0.8 },
                { id: 4, x: WIDTH / 2 + 170 * G_SCALE, y: HEIGHT * 0.4 },
                { id: 5, x: WIDTH / 2 + 170 * G_SCALE, y: HEIGHT * 0.65 },
                { id: 6, x: WIDTH / 2 + 170 * G_SCALE, y: HEIGHT * 0.8 }
            ],
            targetEdges: [
                [0, 1], [0, 4], [1, 2], [2, 3], [4, 5], [5, 6], [1, 4], [2, 5], [3, 6], [1, 5]
            ]
        },

        {
            name: 'LEVEL 15',
            nodes: [
                // Top left & right
                { id: 0, x: WIDTH / 2 - 150 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 1, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.25 },

                // Middle top center
                { id: 2, x: WIDTH / 2, y: HEIGHT * 0.38 },

                // Inner left & right
                { id: 3, x: WIDTH / 2 - 60 * G_SCALE, y: HEIGHT * 0.48 },
                { id: 4, x: WIDTH / 2 + 60 * G_SCALE, y: HEIGHT * 0.48 },

                // Inner bottom
                { id: 5, x: WIDTH / 2, y: HEIGHT * 0.62 },

                // Bottom left & right
                { id: 6, x: WIDTH / 2 - 130 * G_SCALE, y: HEIGHT * 0.80 },
                { id: 7, x: WIDTH / 2 + 130 * G_SCALE, y: HEIGHT * 0.80 },

                // Bottom center
                { id: 8, x: WIDTH / 2, y: HEIGHT * 0.88 },
            ],

            targetEdges: [
                [0, 6], [1, 7], [6, 8], [7, 8], [0, 2], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5], [5, 8]
            ]
        },

        {
            name: 'LEVEL 16',
            nodes: [
                // Top
                { id: 0, x: WIDTH / 2 - 80 * G_SCALE, y: HEIGHT * 0.22 },
                { id: 1, x: WIDTH / 2 + 80 * G_SCALE, y: HEIGHT * 0.22 },

                // Upper right
                { id: 2, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.38 },

                // Right middle
                { id: 3, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.55 },

                // Bottom right
                { id: 4, x: WIDTH / 2 + 80 * G_SCALE, y: HEIGHT * 0.72 },

                // Bottom left
                { id: 5, x: WIDTH / 2 - 80 * G_SCALE, y: HEIGHT * 0.72 },

                // Left middle
                { id: 6, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.55 },

                // Upper left
                { id: 7, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.38 },
            ],
            targetEdges: [
                [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
                [5, 1], [5, 2]
            ]
        },

        {
            name: 'LEVEL 17',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.25 },
                { id: 1, x: WIDTH / 2 - 130 * G_SCALE, y: HEIGHT * 0.45 },
                { id: 2, x: WIDTH / 2 + 130 * G_SCALE, y: HEIGHT * 0.45 },
                { id: 3, x: WIDTH / 2 - 130 * G_SCALE, y: HEIGHT * 0.65 },
                { id: 4, x: WIDTH / 2 + 130 * G_SCALE, y: HEIGHT * 0.65 },
                { id: 5, x: WIDTH / 2, y: HEIGHT * 0.85 },
                { id: 6, x: WIDTH / 2, y: HEIGHT * 0.55 },
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [1, 2], [3, 4], [0, 6], [5, 6], [1, 6], [2, 6], [3, 6], [4, 6]
            ]
        },

        {
            name: 'LEVEL 18',
            nodes: [
                { id: 0, x: WIDTH / 2 - 100 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 1, x: WIDTH / 2 + 100 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 2, x: WIDTH / 2 - 150 * G_SCALE, y: HEIGHT * 0.5 },
                { id: 3, x: WIDTH / 2, y: HEIGHT * 0.5 },
                { id: 4, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.5 },
                { id: 5, x: WIDTH / 2 - 100 * G_SCALE, y: HEIGHT * 0.75 },
                { id: 6, x: WIDTH / 2 + 100 * G_SCALE, y: HEIGHT * 0.75 },
            ],
            targetEdges: [
                [0, 1], [0, 2], [0, 3], [1, 3], [1, 4], [2, 5], [3, 5], [3, 6], [4, 6], [5, 6], [2, 3], [3, 4], [0, 4], [1, 2]
            ]
        },

        {
            name: 'LEVEL 19',
            nodes: [
                { id: 0, x: WIDTH / 2 - 120 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 1, x: WIDTH / 2 + 120 * G_SCALE, y: HEIGHT * 0.25 },
                { id: 2, x: WIDTH / 2, y: HEIGHT * 0.15 },
                { id: 3, x: WIDTH / 2 - 120 * G_SCALE, y: HEIGHT * 0.7 },
                { id: 4, x: WIDTH / 2 + 120 * G_SCALE, y: HEIGHT * 0.7 },
                { id: 5, x: WIDTH / 2, y: HEIGHT * 0.85 },
                { id: 6, x: WIDTH / 2, y: HEIGHT * 0.47 }
            ],
            targetEdges: [
                [2, 0], [2, 1], [0, 1], [0, 3], [1, 4], [3, 4], [3, 5], [4, 5], [2, 6], [5, 6], [0, 6], [1, 6], [3, 6], [4, 6]
            ]
        },

        {
            name: 'LEVEL 20',
            nodes: [
                { id: 0, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.3 },
                { id: 1, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.3 },
                { id: 2, x: WIDTH / 2 - 60 * G_SCALE, y: HEIGHT * 0.45 },
                { id: 3, x: WIDTH / 2 + 60 * G_SCALE, y: HEIGHT * 0.45 },
                { id: 4, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.8 },
                { id: 5, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.8 }
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5], [0, 4], [1, 5], [2, 5], [3, 4]
            ]
        },

    ];



    const currentLevelData = levels[currentLevel];
    const nodes = currentLevelData.nodes;
    const targetEdges = currentLevelData.targetEdges;

    /* FOOTER BUTTONS */
    const getFooterButtons = () => {
        const btnScale = isLandscape ? 0.7 : (isMobile ? 0.75 : 1);
        let footY = isLandscape ? HEIGHT - 22 : HEIGHT - (isMobile ? 50 : 60);
        let undoX, retryX, btnW, btnH;

        if (isTabletLandscape) {
            // TABLET AADU (Landscape): Left side, shifted higher
            btnW = 160; btnH = 55;
            const actualW = btnW * btnScale;
            undoX = actualW / 2 + 40;
            retryX = undoX + actualW + 15;
            footY = HEIGHT - 90;
        } else if (isTabletPortrait) {
            // UBHA TABLET: Left side, shifted higher
            btnW = 160; btnH = 55;
            const actualW = btnW * btnScale;
            undoX = actualW / 2 + 40;
            retryX = undoX + actualW + 15;
            footY = HEIGHT - 135;
        } else if (isMobile && !isLandscape) {
            btnW = 50; btnH = 50; undoX = 30; retryX = 75; footY = HEIGHT - 65;
        } else if (isLandscape) {
            btnW = 60; btnH = 60;
            const actualW = btnW * btnScale;
            undoX = actualW / 2 + 10; retryX = undoX + actualW + 5; footY = HEIGHT - 55;
        } else {
            btnW = 180; btnH = 60; undoX = 120; retryX = 310;
        }
        const actualW = btnW * btnScale;
        const actualH = btnH * btnScale;
        return { footY, undoX, retryX, btnW, btnH, actualW, actualH, btnScale };
    };

    /* DRAW GAME */
    useEffect(() => {
        drawGame();
    }, [drawnPath, currentPos, drawing, edgesDrawn, currentLevel, lives, gameState, dimensions, isWinAnimating]);

    const drawGame = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (gameState === 'levelSelect') {
            const cols = isLandscape ? 6 : (isMobile ? 4 : 5);
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.font = `900 ${isLandscape ? '22px' : (isMobile ? '30px' : '48px')} 'Orbitron', monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('SELECT LEVEL', WIDTH / 2, isLandscape ? 38 : (isMobile ? 65 : 85));

            // Subtitle
            if (!isLandscape) {
                ctx.font = `400 ${isMobile ? '11px' : '14px'} 'Orbitron', monospace`;
                ctx.fillStyle = 'rgba(150,200,255,0.7)';
                ctx.fillText('— ONE LINE DRAW —', WIDTH / 2, isMobile ? 85 : 115);
            }

            const cardW = isLandscape ? 45 : (isMobile ? Math.min(62, WIDTH / (cols + 1)) : 95);
            const cardH = cardW;
            const gapX = isLandscape ? 10 : (isMobile ? 14 : 22);
            const gapY = gapX;
            const totalW = (cardW * cols) + (gapX * (cols - 1));
            const startX = WIDTH / 2 - totalW / 2 + cardW / 2;
            const startY = isLandscape ? 85 : (isMobile ? 130 : 190);

            levels.forEach((lvl, idx) => {
                const ix = idx % cols;
                const iy = Math.floor(idx / cols);
                const x = startX + ix * (cardW + gapX);
                const y = startY + iy * (cardH + gapY);
                const isUnlocked = idx <= maxUnlockedLevel;
                const isCompleted = idx < maxUnlockedLevel;

                ctx.save();
                // Card bg with glassmorphism
                ctx.beginPath();
                ctx.roundRect(x - cardW / 2, y - cardH / 2, cardW, cardH, isMobile ? 12 : 16);
                if (isUnlocked) {
                    const cg = ctx.createLinearGradient(x - cardW / 2, y - cardH / 2, x + cardW / 2, y + cardH / 2);
                    cg.addColorStop(0, 'rgba(80,160,255,0.25)');
                    cg.addColorStop(1, 'rgba(150,80,255,0.25)');
                    ctx.fillStyle = cg;
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.04)';
                }
                ctx.fill();
                ctx.strokeStyle = isUnlocked ? 'rgba(100,180,255,0.6)' : 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                if (!isUnlocked) {
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.font = isLandscape ? '16px Arial' : (isMobile ? '24px Arial' : '32px Arial');
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🔒', x, y);
                } else {
                    ctx.fillStyle = '#fff';
                    ctx.font = `900 ${isLandscape ? '18px' : (isMobile ? '24px' : '32px')} 'Orbitron', monospace`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(idx + 1, x, y);
                    if (isCompleted) {
                        const ck = isMobile ? 8 : 12;
                        ctx.beginPath();
                        ctx.arc(x + cardW / 2 - 2, y + cardH / 2 - 2, ck, 0, Math.PI * 2);
                        const cg2 = ctx.createRadialGradient(x + cardW / 2 - 2, y + cardH / 2 - 2, 0, x + cardW / 2 - 2, y + cardH / 2 - 2, ck);
                        cg2.addColorStop(0, '#00ffaa');
                        cg2.addColorStop(1, '#00cc88');
                        ctx.fillStyle = cg2;
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(0,255,170,0.5)';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 2;
                        ctx.lineCap = 'round';
                        ctx.moveTo(x + cardW / 2 - 2 - ck * 0.4, y + cardH / 2 - 2);
                        ctx.lineTo(x + cardW / 2 - 2 - ck * 0.1, y + cardH / 2 - 2 + ck * 0.45);
                        ctx.lineTo(x + cardW / 2 - 2 + ck * 0.5, y + cardH / 2 - 2 - ck * 0.35);
                        ctx.stroke();
                    }
                }
                ctx.restore();
            });
            return;
        }


        // HUD
        const hudY = isLandscape ? 20 : (isMobile ? 25 : 55);
        const hudScale = isLandscape ? 0.6 : (isSmallMobile ? 0.65 : (isMobile ? 0.75 : 1));
        const homeX = isLandscape ? 25 : (isMobile ? (isSmallMobile ? 25 : 35) : 50);

        /* HOME BUTTON */
        ctx.save();
        ctx.translate(homeX, hudY);
        ctx.scale(hudScale, hudScale);
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        const hg = ctx.createRadialGradient(-5, -5, 0, 0, 0, 26);
        hg.addColorStop(0, 'rgba(80,140,220,0.5)');
        hg.addColorStop(1, 'rgba(40,60,120,0.3)');
        ctx.fillStyle = hg;
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,180,255,0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-10, 5); ctx.lineTo(-10, -5); ctx.lineTo(0, -15); ctx.lineTo(10, -5); ctx.lineTo(10, 5); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(100,180,255,0.4)';
        ctx.fillRect(-3, -2, 6, 7);
        ctx.restore();

        // Progress pill
        const progressX = isLandscape ? (WIDTH / 2 - 230 * hudScale) : (isMobile ? (WIDTH / 2 - 100 * hudScale) : (isTablet ? WIDTH * 0.22 : WIDTH * 0.35));
        const livesX = isLandscape ? (WIDTH / 2 + 230 * hudScale) : (isMobile ? (WIDTH / 2 + 135 * hudScale) : (isTablet ? WIDTH * 0.82 : WIDTH * 0.75));

        /* DRAW PILL */
        const drawPill = (x, y, w, h, text) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(hudScale, hudScale);
            ctx.beginPath();
            ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
            const pg = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
            pg.addColorStop(0, 'rgba(40,80,160,0.6)');
            pg.addColorStop(1, 'rgba(80,40,160,0.6)');
            ctx.fillStyle = pg;
            ctx.fill();
            ctx.strokeStyle = 'rgba(100,160,255,0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            if (text) {
                ctx.fillStyle = '#fff';
                ctx.font = `700 ${isMobile ? 22 : 20}px 'Orbitron', monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, 0, 2);
            }
            ctx.restore();
        };

        drawPill(progressX, hudY, 130, 50, `${edgesDrawn.size}/${targetEdges.length}`);

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `700 ${isLandscape ? '18px' : (isMobile ? '20px' : '28px')} 'Orbitron', monospace`;
        ctx.textAlign = 'center';
        const levelY = isLandscape ? hudY + 5 : (isMobile ? hudY + 75 * hudScale : hudY + 10);
        ctx.fillText(currentLevelData.name, WIDTH / 2, levelY);

        drawPill(livesX, hudY, 160, 50, '');
        ctx.save();
        ctx.translate(livesX, hudY);
        ctx.scale(hudScale, hudScale);
        for (let i = 0; i < 3; i++) {
            const px = -40 + i * 40;
            const isFilled = i < lives;
            ctx.beginPath();
            ctx.arc(px, 0, 13, 0, Math.PI * 2);
            if (isFilled) {
                const dg = ctx.createRadialGradient(px - 3, -3, 0, px, 0, 13);
                dg.addColorStop(0, '#ffffa0');
                dg.addColorStop(1, '#ffcc00');
                ctx.fillStyle = dg;
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
            }
            ctx.fill();
            ctx.strokeStyle = isFilled ? 'rgba(255,220,0,0.8)' : 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();
            if (isFilled) {
                ctx.beginPath();
                ctx.arc(px - 4, -4, 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fill();
            }
        }
        ctx.restore();

        // Draw edges
        targetEdges.forEach(([from, to]) => {
            const edgeKey = `${Math.min(from, to)}-${Math.max(from, to)}`;
            const isDrawn = edgesDrawn.has(edgeKey);
            if (!isDrawn) {
                ctx.strokeStyle = 'rgba(150,170,220,0.2)';
                ctx.lineWidth = 14 * G_SCALE;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(nodes[from].x, nodes[from].y);
                ctx.lineTo(nodes[to].x, nodes[to].y);
                ctx.stroke();
            }
        });

        // Drawn path glow
        if (drawnPath.length > 0) {
            // Outer glow
            if (isWinAnimating) {
                ctx.save();
                ctx.shadowBlur = 40 * G_SCALE;
                ctx.shadowColor = '#00ffaa';
                ctx.strokeStyle = '#00ffaa';
                ctx.lineWidth = 22 * G_SCALE;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(drawnPath[0].x, drawnPath[0].y);
                for (let i = 1; i < drawnPath.length; i++) ctx.lineTo(drawnPath[i].x, drawnPath[i].y);
                ctx.stroke();
                ctx.restore();
            }

            // Main path gradient
            ctx.save();
            ctx.shadowBlur = isWinAnimating ? 0 : 18 * G_SCALE;
            ctx.shadowColor = 'rgba(100,180,255,0.6)';
            ctx.strokeStyle = isWinAnimating ? '#00ffaa' : 'rgba(100,180,255,0.9)';
            ctx.lineWidth = 14 * G_SCALE;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(drawnPath[0].x, drawnPath[0].y);
            for (let i = 1; i < drawnPath.length; i++) ctx.lineTo(drawnPath[i].x, drawnPath[i].y);
            if (currentPos && drawing) ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke();
            ctx.restore();

            // Bright core
            ctx.strokeStyle = isWinAnimating ? 'rgba(200,255,230,0.9)' : 'rgba(220,240,255,0.6)';
            ctx.lineWidth = 4 * G_SCALE;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(drawnPath[0].x, drawnPath[0].y);
            for (let i = 1; i < drawnPath.length; i++) ctx.lineTo(drawnPath[i].x, drawnPath[i].y);
            if (currentPos && drawing) ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke();
        }

        // Nodes
        const nodeScale = isLandscape ? 0.8 : 1;
        nodes.forEach((node, idx) => {
            const isVisited = drawnPath.some(p => p.nodeId === idx);
            const isCurrent = drawnPath.length > 0 && drawnPath[drawnPath.length - 1].nodeId === idx;

            if (isCurrent) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y, 38 * G_SCALE * nodeScale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(100,180,255,0.15)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(100,180,255,0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }

            // Outer ring
            ctx.save();
            ctx.shadowBlur = isVisited ? 20 * G_SCALE : 10 * G_SCALE;
            ctx.shadowColor = isVisited ? 'rgba(100,220,180,0.8)' : 'rgba(100,160,255,0.5)';
            ctx.beginPath();
            ctx.arc(node.x, node.y, 22 * G_SCALE * nodeScale, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(10,20,50,0.8)';
            ctx.fill();
            ctx.strokeStyle = isVisited ? 'rgba(100,220,180,0.9)' : 'rgba(100,160,255,0.7)';
            ctx.lineWidth = 2.5 * G_SCALE * nodeScale;
            ctx.stroke();
            ctx.restore();

            // Inner fill
            const innerR = 16 * G_SCALE * nodeScale;
            const ng = ctx.createRadialGradient(node.x - 4 * G_SCALE, node.y - 4 * G_SCALE, 1, node.x, node.y, innerR);
            if (isVisited) {
                ng.addColorStop(0, '#80ffcc');
                ng.addColorStop(1, '#00aa77');
            } else {
                ng.addColorStop(0, '#80b4ff');
                ng.addColorStop(1, '#2255cc');
            }
            ctx.beginPath();
            ctx.arc(node.x, node.y, innerR, 0, Math.PI * 2);
            ctx.fillStyle = ng;
            ctx.fill();
        });

        // Footer buttons
        const { footY, undoX, retryX, btnW, btnH, btnScale } = getFooterButtons();
        const drawBtn = (x, y, w, h, text, isUndo) => {
            const aw = w * btnScale, ah = h * btnScale;
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = isUndo ? 'rgba(80,160,255,0.4)' : 'rgba(80,255,160,0.4)';
            ctx.beginPath();
            ctx.roundRect(x - aw / 2, y - ah / 2, aw, ah, ah / 2);
            const bg = ctx.createLinearGradient(x - aw / 2, y - ah / 2, x + aw / 2, y + ah / 2);
            if (isUndo) { bg.addColorStop(0, 'rgba(60,120,220,0.7)'); bg.addColorStop(1, 'rgba(80,60,200,0.7)'); }
            else { bg.addColorStop(0, 'rgba(60,200,120,0.7)'); bg.addColorStop(1, 'rgba(20,160,100,0.7)'); }
            ctx.fillStyle = bg;
            ctx.fill();
            ctx.strokeStyle = isUndo ? 'rgba(100,180,255,0.6)' : 'rgba(80,255,160,0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = `700 ${isLandscape ? '26px' : (isMobile ? '22px' : '22px')} Outfit`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const showIconOnly = (isMobile && !isLandscape) || isLandscape;
            ctx.fillText(showIconOnly ? (isUndo ? '↶' : '↻') : (isUndo ? '↶ UNDO' : '↻ RETRY'), x, y + 2);
            ctx.restore();
        };
        drawBtn(undoX, footY, btnW, btnH, 'UNDO', true);
        drawBtn(retryX, footY, btnW, btnH, 'RETRY', false);
    };

    const getMousePos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const getNodeAtPos = (pos) => nodes.findIndex(node => Math.sqrt(Math.pow(pos.x - node.x, 2) + Math.pow(pos.y - node.y, 2)) < 45);
    const checkEdgeExists = (from, to) => targetEdges.some(([a, b]) => (a === from && b === to) || (a === to && b === from));

    const handleMouseDown = (e) => {
        const pos = getMousePos(e);
        const hudY = isLandscape ? 20 : (isMobile ? 25 : 55);
        const hudScale = isLandscape ? 0.6 : (isSmallMobile ? 0.65 : (isMobile ? 0.75 : 1));
        const homeX = isLandscape ? 25 : (isMobile ? (isSmallMobile ? 25 : 35) : 50);
        const isHome = Math.sqrt(Math.pow(pos.x - homeX, 2) + Math.pow(pos.y - hudY, 2)) < (30 * hudScale);
        if (isHome) {
            setGameState(gameState === 'levelSelect' ? 'playing' : 'levelSelect');
            return;
        }

        if (gameState === 'levelSelect') {
            const cols = isLandscape ? 6 : (isMobile ? 4 : 5);
            const cardW = isLandscape ? 45 : (isMobile ? Math.min(62, WIDTH / (cols + 1)) : 95);
            const cardH = cardW;
            const gapX = isLandscape ? 10 : (isMobile ? 14 : 22);
            const totalW = (cardW * cols) + (gapX * (cols - 1));
            const startX = WIDTH / 2 - totalW / 2 + cardW / 2;
            const startY = isLandscape ? 85 : (isMobile ? 130 : 190);
            levels.forEach((lvl, idx) => {
                const ix = idx % cols, iy = Math.floor(idx / cols);
                const x = startX + ix * (cardW + gapX), y = startY + iy * (cardH + gapX);
                if (pos.x >= (x - cardW / 2) && pos.x <= (x + cardW / 2) && pos.y >= (y - cardH / 2) && pos.y <= (y + cardH / 2)) {
                    if (idx <= maxUnlockedLevel) {
                        setCurrentLevel(idx);
                        setGameState('playing');
                        setDrawnPath([]); setEdgesDrawn(new Set()); setLives(3); setMessage({ text: '', type: '' });
                    }
                }
            });
            return;
        }

        const { footY, undoX, retryX, actualW, actualH } = getFooterButtons();
        if (pos.x >= undoX - actualW / 2 && pos.x <= undoX + actualW / 2 && pos.y >= footY - actualH / 2 && pos.y <= footY + actualH / 2) { handleUndo(); return; }
        if (pos.x >= retryX - actualW / 2 && pos.x <= retryX + actualW / 2 && pos.y >= footY - actualH / 2 && pos.y <= footY + actualH / 2) { handleRetry(); return; }
        if (lives <= 0) return;

        const nodeIdx = getNodeAtPos(pos);
        if (nodeIdx !== -1) {
            if (drawnPath.length > 0 && nodeIdx === drawnPath[drawnPath.length - 1].nodeId) {
                setDrawing(true); return;
            }
            const node = nodes[nodeIdx];
            setDrawing(true);
            setDrawnPath([{ x: node.x, y: node.y, nodeId: nodeIdx }]);
            setCurrentPos({ x: node.x, y: node.y });
            setEdgesDrawn(new Set());
            setMessage({ text: '', type: '' });
        }
    };

    const handleMouseMove = (e) => {
        const pos = getMousePos(e);
        if (!drawing) return;
        setCurrentPos(pos);

        const nodeIdx = getNodeAtPos(pos);
        if (nodeIdx !== -1 && drawnPath.length > 0) {
            const lastNode = drawnPath[drawnPath.length - 1];
            if (nodeIdx === lastNode.nodeId) return;
            const edgeKey = `${Math.min(lastNode.nodeId, nodeIdx)}-${Math.max(lastNode.nodeId, nodeIdx)}`;

            if (!checkEdgeExists(lastNode.nodeId, nodeIdx)) {
                const nl = Math.max(0, lives - 1);
                setLives(nl); setDrawing(false); setCurrentPos(null); setDrawnPath([]); setEdgesDrawn(new Set());
                if (nl === 0) setTimeout(() => setMessage({ text: '💔 Game Over! Click RETRY', type: 'lose' }), 500);
                return;
            }
            if (edgesDrawn.has(edgeKey)) {
                const nl = Math.max(0, lives - 1);
                setLives(nl); setDrawing(false); setCurrentPos(null); setDrawnPath([]); setEdgesDrawn(new Set());
                if (nl === 0) setTimeout(() => setMessage({ text: '💔 Game Over! Click RETRY', type: 'lose' }), 500);
                return;
            }
            if (drawnPath.length > 1 && nodeIdx === drawnPath[drawnPath.length - 2].nodeId) {
                handleUndo(); setDrawing(false); return;
            }

            const newPath = [...drawnPath, { x: nodes[nodeIdx].x, y: nodes[nodeIdx].y, nodeId: nodeIdx }];
            const newEdges = new Set(edgesDrawn);
            newEdges.add(edgeKey);
            setDrawnPath(newPath);
            setEdgesDrawn(newEdges);

            if (newEdges.size === targetEdges.length) {
                setDrawing(false);
                setIsWinAnimating(true);
                setTimeout(() => {
                    setIsWinAnimating(false);
                    setMessage({ text: '🎉 PERFECT! NEXT LEVEL...', type: 'win' });
                    const nextLevel = currentLevel + 1;
                    if (nextLevel < levels.length && nextLevel > maxUnlockedLevel) {
                        setMaxUnlockedLevel(nextLevel);
                    }
                }, 1000);
            }
        }
    };

    const handleMouseUp = () => { // 19-02 //           
        if (drawing && drawnPath.length > 0 && edgesDrawn.size > 0 && edgesDrawn.size < targetEdges.length) {
            const nl = Math.max(0, lives - 1);
            setLives(nl);
            setDrawnPath([]);
            setEdgesDrawn(new Set());
            if (nl === 0) setTimeout(() => setMessage({ text: '💔 Game Over! Click RETRY', type: 'lose' }), 500);
        }
        setDrawing(false);
        setCurrentPos(null);
    };
    const handleUndo = () => {
        if (drawnPath.length > 1) {
            const np = drawnPath.slice(0, -1);
            const ne = new Set();
            for (let i = 1; i < np.length; i++) {
                const f = np[i - 1].nodeId, t = np[i].nodeId;
                ne.add(`${Math.min(f, t)}-${Math.max(f, t)}`);
            }
            setDrawnPath(np); setEdgesDrawn(ne); setMessage({ text: '', type: '' });
        } else { setDrawnPath([]); setEdgesDrawn(new Set()); }
    };
    const handleRetry = () => { setDrawnPath([]); setCurrentPos(null); setDrawing(false); setLives(3); setEdgesDrawn(new Set()); setMessage({ text: '', type: '' }); };
    const handleNextLevel = () => {
        const next = currentLevel + 1;
        if (next < levels.length) {
            setCurrentLevel(next); setDrawnPath([]); setEdgesDrawn(new Set()); setLives(3); setMessage({ text: '', type: '' });
        } else {
            setMessage({ text: '🏆 ALL LEVELS CLEARED! WELL DONE!', type: 'win' });
        }
    };

    return (
        <div style={{
            fontFamily: "'Orbitron', 'Outfit', monospace",
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            width: '100vw',
            overflow: 'hidden',
            position: 'relative',
            background: '#060610'
        }}>
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Outfit:wght@400;500;700;900&display=swap" rel="stylesheet" />

            {/* Animated BG Canvas */}
            <canvas
                ref={bgCanvasRef}
                width={WIDTH}
                height={HEIGHT}
                style={{
                    position: 'absolute', top: 0, left: 0,
                    zIndex: 0, display: 'block', pointerEvents: 'none'
                }}
            />

            {/* Scanline overlay */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
                zIndex: 1, pointerEvents: 'none'
            }} />

            {/* Vignette */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
                zIndex: 1, pointerEvents: 'none'
            }} />

            <style>{`
                @keyframes bannerPop {
                    0% { transform: translate(-50%,-50%) scale(0.8); opacity:0; }
                    100% { transform: translate(-50%,-50%) scale(1); opacity:1; }
                }
                @keyframes starPop {
                    0% { transform: scale(0) rotate(-45deg); opacity:0; }
                    70% { transform: scale(1.2) rotate(10deg); opacity:1; }
                    100% { transform: scale(1) rotate(0deg); opacity:1; }
                }
                @keyframes glitch {
                    0%,100% { transform: translate(-50%,-50%) skewX(0deg); }
                    20% { transform: translate(-50%,-50%) skewX(-2deg); }
                    40% { transform: translate(-50%,-50%) skewX(2deg); }
                    60% { transform: translate(-50%,-50%) skewX(-1deg); }
                }
            `}</style>

            <canvas
                ref={canvasRef}
                width={WIDTH}
                height={HEIGHT}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={(e) => { e.preventDefault(); handleMouseDown(e.touches[0]); }}
                onTouchMove={(e) => { e.preventDefault(); handleMouseMove(e.touches[0]); }}
                onTouchEnd={(e) => { e.preventDefault(); handleMouseUp(); }}
                style={{
                    background: 'transparent',
                    display: 'block',
                    cursor: drawing ? 'crosshair' : 'pointer',
                    position: 'relative',
                    zIndex: 2,
                    touchAction: 'none'
                }}
            />

            {message.text && (
                <>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,5,20,0.7)',
                        backdropFilter: 'blur(12px)',
                        zIndex: 9
                    }} />
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%,-50%)',
                        width: isMobile ? (isLandscape ? '80%' : '70%') : '85%',
                        maxWidth: isLandscape ? '400px' : '420px',
                        maxHeight: isMobile ? '90vh' : 'none',
                        overflowY: isMobile ? 'auto' : 'visible',
                        padding: isMobile ? (isLandscape ? '12px 16px' : '16px 14px 14px') : '44px 28px 36px',
                        borderRadius: isMobile ? '18px' : '24px',
                        background: message.type === 'win'
                            ? 'linear-gradient(135deg, rgba(0,30,60,0.95), rgba(0,20,50,0.98))'
                            : 'linear-gradient(135deg, rgba(40,0,20,0.95), rgba(30,0,30,0.98))',
                        boxShadow: message.type === 'win'
                            ? '0 0 40px rgba(0,180,255,0.3), inset 0 0 20px rgba(0,100,255,0.05)'
                            : '0 0 40px rgba(255,50,50,0.2)',
                        border: message.type === 'win' ? '1px solid rgba(0,180,255,0.3)' : '1px solid rgba(255,50,100,0.3)',
                        zIndex: 10,
                        textAlign: 'center',
                        animation: 'bannerPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: isMobile ? '6px' : '16px'
                    }}>
                        {/* Top accent line */}
                        <div style={{
                            position: 'absolute', top: 0, left: '50%',
                            transform: 'translateX(-50%)',
                            width: '60%', height: '2px',
                            background: message.type === 'win'
                                ? 'linear-gradient(90deg, transparent, #00aaff, transparent)'
                                : 'linear-gradient(90deg, transparent, #ff4488, transparent)',
                            borderRadius: '2px'
                        }} />

                        <div style={{
                            width: isMobile ? (isLandscape ? '40px' : '44px') : '80px',
                            height: isMobile ? (isLandscape ? '40px' : '44px') : '80px',
                            borderRadius: '50%',
                            background: message.type === 'win'
                                ? 'radial-gradient(circle, rgba(0,200,255,0.2), rgba(0,100,200,0.1))'
                                : 'radial-gradient(circle, rgba(255,50,100,0.2), rgba(200,0,50,0.1))',
                            border: message.type === 'win' ? '2px solid rgba(0,200,255,0.4)' : '2px solid rgba(255,50,100,0.4)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            fontSize: isMobile ? '20px' : '36px', flexShrink: 0
                        }}>
                            {message.type === 'win' ? '⭐' : '💔'}
                        </div>

                        {message.type === 'win' && (
                            <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', alignItems: 'center' }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} style={{
                                        fontSize: i === 2 ? (isMobile ? '22px' : '36px') : (isMobile ? '16px' : '26px'),
                                        animation: `starPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards ${i * 0.15 + 0.4}s`,
                                        opacity: 0
                                    }}>⭐</div>
                                ))}
                            </div>
                        )}

                        <div style={{
                            fontSize: isMobile ? '16px' : '28px', fontWeight: '900',
                            color: message.type === 'win' ? '#80e0ff' : '#ff88aa',
                            fontFamily: "'Orbitron', monospace",
                            letterSpacing: isMobile ? '1px' : '2px',
                            lineHeight: 1.2,
                            textShadow: message.type === 'win'
                                ? '0 0 20px rgba(0,200,255,0.5)'
                                : '0 0 20px rgba(255,50,100,0.5)'
                        }}>
                            {message.type === 'win' ? 'LEVEL CLEARED' : 'GAME OVER'}
                        </div>

                        <div style={{
                            fontSize: isMobile ? '11px' : '15px', color: 'rgba(200,220,255,0.6)',
                            fontFamily: "'Outfit', sans-serif",
                            maxWidth: isMobile ? '90%' : '80%', lineHeight: '1.4'
                        }}>
                            {/* {message.type === 'win' ?  : "Don't give up, try again."} */}
                        </div>

                        <div onClick={message.type === 'win' ? handleNextLevel : handleRetry}
                            style={{
                                marginTop: isMobile ? '2px' : '8px',
                                padding: isMobile ? '8px 22px' : '14px 36px',
                                background: message.type === 'win'
                                    ? 'linear-gradient(135deg, #0088ff, #0044cc)'
                                    : 'linear-gradient(135deg, #ff4466, #cc0044)',
                                color: '#fff', borderRadius: '50px',
                                fontWeight: '700', fontSize: isMobile ? '11px' : '15px',
                                fontFamily: "'Orbitron', monospace",
                                letterSpacing: '1px',
                                boxShadow: message.type === 'win'
                                    ? '0 4px 16px rgba(0,136,255,0.4)'
                                    : '0 4px 16px rgba(255,50,100,0.4)',
                                cursor: 'pointer', border: 'none',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                whiteSpace: 'nowrap'
                            }}>
                            {message.type === 'win' ? 'NEXT LEVEL ➔' : 'TRY AGAIN ↻'}
                        </div>
                    </div>
                </>
            )}

            {/* 19-02 -- Mobile Landscape Error Overlay */}
            {isMobileDevice && isLandscape && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'linear-gradient(135deg, #060610 0%, #101030 100%)',
                    zIndex: 9999, display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center', textAlign: 'center',
                    padding: '20px', color: '#fff', fontFamily: "'Orbitron', sans-serif"
                }}>
                    <div style={{
                        fontSize: '60px', marginBottom: '20px',
                        animation: 'rotateDevice 2s ease-in-out infinite'
                    }}>📱🔄</div>
                    <h2 style={{ fontSize: '24px', marginBottom: '10px', color: '#80e0ff' }}>PLEASE ROTATE DEVICE</h2>
                    <p style={{ fontSize: '14px', opacity: 0.8, maxWidth: '300px', lineHeight: '1.6' }}>
                        {/* This game is designed to be played in Portrait mode for the best experience. */}
                    </p>
                    <style>{`
                        @keyframes rotateDevice {
                            0% { transform: rotate(0deg); }
                            25% { transform: rotate(90deg); }
                            50% { transform: rotate(90deg); }
                            75% { transform: rotate(0deg); }
                            100% { transform: rotate(0deg); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}