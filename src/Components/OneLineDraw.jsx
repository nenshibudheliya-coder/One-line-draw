import React, { useState, useRef, useEffect } from 'react';

export default function OneLineDraw() {
    const canvasRef = useRef(null);
    const bgCanvasRef = useRef(null);

    // ✅ FIX 1: localStorage હટાવ્યું - window.storage વાપર્યું
    const [currentLevel, setCurrentLevel] = useState(0);
    const [gameState, setGameState] = useState('home');
    const [drawnPath, setDrawnPath] = useState([]);
    const [currentPos, setCurrentPos] = useState(null);
    const [drawing, setDrawing] = useState(false);
    const [lives, setLives] = useState(3);
    const [edgesDrawn, setEdgesDrawn] = useState(new Set());
    const [message, setMessage] = useState({ text: '', type: '' });
    const [isWinAnimating, setIsWinAnimating] = useState(false);
    const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(0);
    const [levelSelectPage, setLevelSelectPage] = useState(0); // 24-02 //
    const [storageLoaded, setStorageLoaded] = useState(false);

    const bgAnimRef = useRef(null);
    const particlesRef = useRef([]);
    const timeRef = useRef(0);

    // ✅ FIX 2: localStorage થી progress load કરો // 24-02 //
    useEffect(() => {
        try { // 24-02 //
            const maxVal = localStorage.getItem('oneline_maxLevel');
            const curVal = localStorage.getItem('oneline_currentLevel');
            if (maxVal !== null) setMaxUnlockedLevel(parseInt(maxVal) || 0);
            if (curVal !== null) setCurrentLevel(parseInt(curVal) || 0);
        } catch (e) {
            console.error("Error loading progress:", e);
        }
        setStorageLoaded(true);
    }, []);

    // ✅ FIX 3: Progress save with localStorage
    useEffect(() => {
        if (!storageLoaded) return;
        try { // 24-02 //
            localStorage.setItem('oneline_maxLevel', maxUnlockedLevel.toString());
            localStorage.setItem('oneline_currentLevel', currentLevel.toString());
        } catch (e) {
            console.error("Error saving progress:", e);
        }
    }, [maxUnlockedLevel, currentLevel, storageLoaded]);

    // ✅ FIX 4: Responsive dimensions - window resize handle
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const { width: WIDTH, height: HEIGHT } = dimensions;
    const isMobile = WIDTH < 600;
    const isMobileDevice = Math.min(WIDTH, HEIGHT) < 600;
    const isSmallMobile = WIDTH < 400;
    const isLandscape = WIDTH > HEIGHT && HEIGHT < 500;
    const isTabletPortrait = !isMobile && HEIGHT > WIDTH && WIDTH >= 600 && WIDTH <= 1024;
    const isTabletLandscape = !isMobile && WIDTH > HEIGHT && WIDTH <= 1440 && HEIGHT >= 500;
    const isTablet = isTabletPortrait || isTabletLandscape;
    const G_SCALE = isMobile ? Math.min(1, (isLandscape ? HEIGHT / 400 : WIDTH / 500)) : 1;

    // Initialize background particles //
    useEffect(() => {
        const count = isMobile ? 40 : 70;
        particlesRef.current = Array.from({ length: count }, (_, i) => ({
            id: i,
            x: Math.random() * WIDTH,
            y: Math.random() * HEIGHT,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: Math.random() * 3 + 1,
            opacity: Math.random() * 0.5 + 0.1,
            pulse: Math.random() * Math.PI * 2,
        }));
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

            const grad = ctx.createRadialGradient(WIDTH * 0.4, HEIGHT * 0.3, 0, WIDTH * 0.5, HEIGHT * 0.5, WIDTH * 0.9);
            grad.addColorStop(0, '#0a0a1a');
            grad.addColorStop(0.4, '#0d0d2b');
            grad.addColorStop(0.7, '#0a0f20');
            grad.addColorStop(1, '#060610');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            const blobs = [
                { x: WIDTH * 0.2, y: HEIGHT * 0.3, r: WIDTH * 0.35, c1: 'rgba(118,75,162,0.07)' },
                { x: WIDTH * 0.8, y: HEIGHT * 0.7, r: WIDTH * 0.4, c1: 'rgba(29,161,242,0.06)' },
                { x: WIDTH * 0.5, y: HEIGHT * 0.1, r: WIDTH * 0.3, c1: 'rgba(255,100,100,0.04)' },
            ];
            blobs.forEach(b => {
                const px = b.x + Math.sin(t * 0.3) * 20;
                const py = b.y + Math.cos(t * 0.2) * 15;
                const gr = ctx.createRadialGradient(px, py, 0, px, py, b.r);
                gr.addColorStop(0, b.c1);
                gr.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gr;
                ctx.fillRect(0, 0, WIDTH, HEIGHT);
            });

            ctx.strokeStyle = 'rgba(100,120,180,0.06)';
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= WIDTH; x += 50) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, HEIGHT);
                ctx.stroke();
            }
            for (let y = 0; y <= HEIGHT; y += 50) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(WIDTH, y);
                ctx.stroke();
            }

            const parts = particlesRef.current;
            parts.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.pulse += 0.02;
                if (p.x < 0 || p.x > WIDTH) p.vx *= -1;
                if (p.y < 0 || p.y > HEIGHT) p.vy *= -1;
            });

            for (let i = 0; i < parts.length; i++) {
                for (let j = i + 1; j < parts.length; j++) {
                    const dx = parts[i].x - parts[j].x, dy = parts[i].y - parts[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = isMobile ? 80 : 120;
                    if (dist < maxDist) {
                        ctx.strokeStyle = `rgba(150,180,255,${(1 - dist / maxDist) * 0.25})`;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(parts[i].x, parts[i].y);
                        ctx.lineTo(parts[j].x, parts[j].y);
                        ctx.stroke();
                    }
                }
            }

            parts.forEach(p => {
                const pulse = (Math.sin(p.pulse) * 0.5 + 0.5) * 0.4 + 0.1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * (0.8 + Math.sin(p.pulse) * 0.2), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(180,200,255,${pulse})`;
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
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.12 },                 // Peak
                { id: 1, x: WIDTH / 2 - 130 * G_SCALE, y: HEIGHT * 0.22 }, // Top Left
                { id: 2, x: WIDTH / 2 + 130 * G_SCALE, y: HEIGHT * 0.22 }, // Top Right
                { id: 3, x: WIDTH / 2 - 130 * G_SCALE, y: HEIGHT * 0.44 }, // Mid Left
                { id: 4, x: WIDTH / 2 + 130 * G_SCALE, y: HEIGHT * 0.44 }, // Mid Right
                { id: 5, x: WIDTH / 2 - 130 * G_SCALE, y: HEIGHT * 0.66 }, // Low Left
                { id: 6, x: WIDTH / 2 + 130 * G_SCALE, y: HEIGHT * 0.66 }, // Low Right
                { id: 7, x: WIDTH / 2, y: HEIGHT * 0.82 }                  // Bottom Tip
            ],
            targetEdges: [
                [0, 1], [0, 2],         // Top to shoulders
                [1, 3], [2, 4],         // Verticals upper
                [1, 4],                 // Diagonal UL to MR
                [3, 4],                 // Middle horizontal
                [3, 5], [4, 6],         // Verticals lower
                [3, 6],                 // Diagonal ML to LR
                [5, 6],                 // Lower horizontal
                [5, 7], [6, 7]          // Slants to bottom
            ]
        },
        {
            name: 'LEVEL 16',
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
            name: 'LEVEL 17',
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
            name: 'LEVEL 18',
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
            name: 'LEVEL 19',
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
            name: 'LEVEL 20',
            nodes: [
                { id: 0, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.25 }, // Top Left
                { id: 1, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.25 }, // Top Right
                { id: 2, x: WIDTH / 2, y: HEIGHT * 0.33 },                 // Top Middle
                { id: 3, x: WIDTH / 2 - 60 * G_SCALE, y: HEIGHT * 0.45 },  // Mid Left
                { id: 4, x: WIDTH / 2 + 60 * G_SCALE, y: HEIGHT * 0.45 },  // Mid Right
                { id: 5, x: WIDTH / 2, y: HEIGHT * 0.55 },                 // Center
                { id: 6, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.65 }, // Bottom Left
                { id: 7, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.65 }, // Bottom Right
                { id: 8, x: WIDTH / 2, y: HEIGHT * 0.80 }                  // Bottom Tip
            ],
            targetEdges: [
                [0, 2], [1, 2],         // Top "V"
                [0, 6], [1, 7],         // Outer edges
                [2, 3], [2, 4],         // Upper inner diagonals
                [3, 5], [4, 5],         // Middle inner diagonals
                [5, 6], [5, 7],         // Lower inner diagonals
                [3, 8], [4, 8]          // Bottom "V"
            ]
        },

        {
            name: 'LEVEL 21',
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
            name: 'LEVEL 22',
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
        {
            name: 'LEVEL 23',
            nodes: [
                { id: 0, x: WIDTH / 2 - 100 * G_SCALE, y: HEIGHT * 0.25 }, // Top-Left Peak
                { id: 1, x: WIDTH / 2 + 100 * G_SCALE, y: HEIGHT * 0.25 }, // Top-Right Peak
                { id: 2, x: WIDTH / 2, y: HEIGHT * 0.38 },                 // Upper Center
                { id: 3, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.45 }, // Mid-Left Side
                { id: 4, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.45 }, // Mid-Right Side
                { id: 5, x: WIDTH / 2, y: HEIGHT * 0.58 },                 // Middle Center
                { id: 6, x: WIDTH / 2 - 140 * G_SCALE, y: HEIGHT * 0.72 }, // Bottom-Left Side
                { id: 7, x: WIDTH / 2 + 140 * G_SCALE, y: HEIGHT * 0.72 }, // Bottom-Right Side
                { id: 8, x: WIDTH / 2, y: HEIGHT * 0.82 }                  // Very Bottom Peak
            ],
            targetEdges: [
                [0, 2], [1, 2], [0, 3], [1, 4], [2, 6], [2, 7],
                [3, 5], [4, 5], [5, 6], [5, 7], [6, 8], [7, 8], [6, 7]
            ]
        },
        {
            name: 'LEVEL 24',
            nodes: [
                { id: 0, x: WIDTH / 2 - 150 * G_SCALE, y: HEIGHT * 0.25 }, // Top Left
                { id: 1, x: WIDTH / 2, y: HEIGHT * 0.25 },                 // Top Center
                { id: 2, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.25 }, // Top Right
                { id: 3, x: WIDTH / 2 - 100 * G_SCALE, y: HEIGHT * 0.48 }, // Mid Left
                { id: 4, x: WIDTH / 2, y: HEIGHT * 0.42 },                 // Mid Center Peak
                { id: 5, x: WIDTH / 2 + 100 * G_SCALE, y: HEIGHT * 0.48 }, // Mid Right
                { id: 6, x: WIDTH / 2 - 100 * G_SCALE, y: HEIGHT * 0.78 }, // Bottom Left
                { id: 7, x: WIDTH / 2, y: HEIGHT * 0.70 },                 // Bottom Center Peak (^)
                { id: 8, x: WIDTH / 2 + 100 * G_SCALE, y: HEIGHT * 0.78 }  // Bottom Right
            ],
            targetEdges: [
                [0, 3], [0, 4], [1, 3], [1, 5], [2, 4], [2, 5],
                [3, 4], [4, 5],
                [3, 6], [5, 8],
                [6, 7], [7, 8]
            ]
        },
        {
            name: 'LEVEL 25',
            nodes: [
                { id: 0, x: WIDTH / 2 - 150 * G_SCALE, y: HEIGHT * 0.18 }, // Top Left
                { id: 1, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.18 }, // Top Right

                { id: 2, x: WIDTH / 2 - 230 * G_SCALE, y: HEIGHT * 0.40 }, // Left Outer
                { id: 3, x: WIDTH / 2 + 230 * G_SCALE, y: HEIGHT * 0.40 }, // Right Outer

                { id: 4, x: WIDTH / 2, y: HEIGHT * 0.48 },                 // Center

                { id: 5, x: WIDTH / 2, y: HEIGHT * 0.75 },                 // Lower Middle

                { id: 6, x: WIDTH / 2, y: HEIGHT * 0.95 }                  // Bottom
            ],

            targetEdges: [
                [0, 2], [1, 3], [0, 4], [1, 4], [4, 2], [4, 3], [2, 6],
                [3, 6], [2, 5], [3, 5], [5, 6]
            ]
        },
        {
            name: 'LEVEL 26',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.22 },                 // Top Peak
                { id: 1, x: WIDTH / 2 - 130 * G_SCALE, y: HEIGHT * 0.38 }, // Upper Left
                { id: 2, x: WIDTH / 2 + 130 * G_SCALE, y: HEIGHT * 0.38 }, // Upper Right
                { id: 3, x: WIDTH / 2, y: HEIGHT * 0.48 },                 // Mid Center
                { id: 4, x: WIDTH / 2 - 140 * G_SCALE, y: HEIGHT * 0.62 }, // Lower Left
                { id: 5, x: WIDTH / 2 + 140 * G_SCALE, y: HEIGHT * 0.62 }, // Lower Right
                { id: 6, x: WIDTH / 2 - 100 * G_SCALE, y: HEIGHT * 0.82 }, // Bottom Left
                { id: 7, x: WIDTH / 2 + 100 * G_SCALE, y: HEIGHT * 0.82 }  // Bottom Right
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 2], [1, 3], [2, 3],
                [3, 4], [3, 5], [4, 5], [4, 6], [5, 7],
                [6, 7], [1, 4], [2, 5]
            ]
        },
        {
            name: 'LEVEL 27',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.28 },                 // Center Peak
                { id: 1, x: WIDTH / 2 - 180 * G_SCALE, y: HEIGHT * 0.25 }, // Top Wing L
                { id: 2, x: WIDTH / 2 + 180 * G_SCALE, y: HEIGHT * 0.25 }, // Top Wing R
                { id: 3, x: WIDTH / 2 - 100 * G_SCALE, y: HEIGHT * 0.45 }, // Mid Wing L
                { id: 4, x: WIDTH / 2 + 100 * G_SCALE, y: HEIGHT * 0.45 }, // Mid Wing R
                { id: 5, x: WIDTH / 2 - 160 * G_SCALE, y: HEIGHT * 0.65 }, // Low Wing L
                { id: 6, x: WIDTH / 2 + 160 * G_SCALE, y: HEIGHT * 0.65 }, // Low Wing R
                { id: 7, x: WIDTH / 2 - 60 * G_SCALE, y: HEIGHT * 0.85 },  // Base L
                { id: 8, x: WIDTH / 2 + 60 * G_SCALE, y: HEIGHT * 0.85 }   // Base R
            ],
            targetEdges: [
                [0, 3], [0, 4], [1, 3], [2, 4], [3, 5], [4, 6],
                [5, 7], [6, 8], [7, 8], [3, 4], [5, 6],
                [1, 5], [2, 6], [0, 7], [0, 8]
            ]
        },
        {
            name: 'LEVEL 28',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.20 },
                { id: 1, x: WIDTH / 2 - 100 * G_SCALE, y: HEIGHT * 0.35 },
                { id: 2, x: WIDTH / 2 + 100 * G_SCALE, y: HEIGHT * 0.35 },
                { id: 3, x: WIDTH / 2 - 180 * G_SCALE, y: HEIGHT * 0.55 },
                { id: 4, x: WIDTH / 2, y: HEIGHT * 0.55 },
                { id: 5, x: WIDTH / 2 + 180 * G_SCALE, y: HEIGHT * 0.55 },
                { id: 6, x: WIDTH / 2 - 100 * G_SCALE, y: HEIGHT * 0.75 },
                { id: 7, x: WIDTH / 2 + 100 * G_SCALE, y: HEIGHT * 0.75 },
                { id: 8, x: WIDTH / 2, y: HEIGHT * 0.90 }
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8],
                [3, 4], [5, 4], [1, 2], [6, 7]
            ] // 0:2, 1:4, 2:4, 3:2+1+1=4, 4:8, 5:4, 6:4, 7:4, 8:2. Yes.
        },
        {
            name: 'LEVEL 29',
            nodes: [
                { id: 0, x: WIDTH / 2, y: HEIGHT * 0.15 },                 // Top
                { id: 1, x: WIDTH / 2 - 180 * G_SCALE, y: HEIGHT * 0.35 }, // Upper L
                { id: 2, x: WIDTH / 2 + 180 * G_SCALE, y: HEIGHT * 0.35 }, // Upper R
                { id: 3, x: WIDTH / 2 - 180 * G_SCALE, y: HEIGHT * 0.65 }, // Lower L
                { id: 4, x: WIDTH / 2 + 180 * G_SCALE, y: HEIGHT * 0.65 }, // Lower R
                { id: 5, x: WIDTH / 2, y: HEIGHT * 0.85 },                 // Bottom
                { id: 6, x: WIDTH / 2 - 90 * G_SCALE, y: HEIGHT * 0.40 },  // Inner U L
                { id: 7, x: WIDTH / 2 + 90 * G_SCALE, y: HEIGHT * 0.40 },  // Inner U R
                { id: 8, x: WIDTH / 2 - 90 * G_SCALE, y: HEIGHT * 0.60 },  // Inner L L
                { id: 9, x: WIDTH / 2 + 90 * G_SCALE, y: HEIGHT * 0.60 }   // Inner L R
            ],
            targetEdges: [
                [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [0, 6], [0, 7], [1, 6], [1, 8], [2, 7], [2, 9], [3, 8], [3, 6], [4, 9], [4, 7], [5, 8], [5, 9], [6, 8], [7, 9]
            ]
        },
        {
            name: 'LEVEL 30',
            nodes: [
                { id: 0, x: WIDTH / 2 - 150 * G_SCALE, y: HEIGHT * 0.18 }, // TL
                { id: 1, x: WIDTH / 2, y: HEIGHT * 0.30 },                 // CT
                { id: 2, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.18 }, // TR
                { id: 3, x: WIDTH / 2 - 220 * G_SCALE, y: HEIGHT * 0.50 }, // L
                { id: 4, x: WIDTH / 2, y: HEIGHT * 0.50 },                 // Center
                { id: 5, x: WIDTH / 2 + 220 * G_SCALE, y: HEIGHT * 0.50 }, // R
                { id: 6, x: WIDTH / 2 - 150 * G_SCALE, y: HEIGHT * 0.82 }, // BL
                { id: 7, x: WIDTH / 2, y: HEIGHT * 0.70 },                 // CB
                { id: 8, x: WIDTH / 2 + 150 * G_SCALE, y: HEIGHT * 0.82 }  // BR
            ],
            targetEdges: [
                [0, 1], [1, 2], [2, 5], [5, 8], [8, 7], [7, 6], [6, 3], [3, 0], // Outer Star
                [0, 2], [6, 8],                                                 // Stabilizers
                [0, 4], [2, 4], [6, 4], [8, 4],                                 // Ordinal Hub
                [1, 3], [3, 7], [7, 5], [5, 1]                                  // Diamond
            ]
        }
    ];



    const currentLevelData = levels[Math.min(currentLevel, levels.length - 1)];
    const nodes = currentLevelData.nodes;
    const targetEdges = currentLevelData.targetEdges;

    {/* Undo ane Retry Button */ }
    const getFooterButtons = () => {
        const btnScale = isLandscape ? 0.7 : (isMobile ? 0.75 : 1);
        let footY = isLandscape ? HEIGHT - 22 : HEIGHT - (isMobile ? 50 : 60);
        let undoX, retryX, btnW, btnH;
        if (isTabletLandscape) {
            btnW = 160;
            btnH = 55;
            const aw = btnW * btnScale;
            undoX = aw / 2 + 40;
            retryX = undoX + aw + 15;
            footY = HEIGHT - 90;
        }
        else if (isTabletPortrait) {
            btnW = 160;
            btnH = 55;
            const aw = btnW * btnScale;
            undoX = aw / 2 + 40;
            retryX = undoX + aw + 15;
            footY = HEIGHT - 135;
        }
        else if (isMobile && !isLandscape) {
            btnW = 50;
            btnH = 50;
            undoX = 30;
            retryX = 75;
            footY = HEIGHT - 65;
        }
        else if (isLandscape) {
            btnW = 60;
            btnH = 60;
            const aw = btnW * btnScale;
            undoX = aw / 2 + 10;
            retryX = undoX + aw + 5;
            footY = HEIGHT - 55;
        }
        else {
            btnW = 180;
            btnH = 60;
            undoX = 120;
            retryX = 310;
            footY = HEIGHT - 40;
        }
        const actualW = btnW * btnScale, actualH = btnH * btnScale;
        return { footY, undoX, retryX, btnW, btnH, actualW, actualH, btnScale };
    };

    useEffect(() => { drawGame(); }, [drawnPath, currentPos, drawing, edgesDrawn, currentLevel, lives, gameState, dimensions, isWinAnimating, levelSelectPage]);

    //Animation loop for home screen 23-02 --onelinebanner//
    useEffect(() => {
        if (gameState !== 'home') return;
        let frameId;
        const animate = () => {
            drawGame();
            frameId = requestAnimationFrame(animate);
        };
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [gameState, dimensions]);


    {/* Draw Game */ }
    const drawGame = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 23-02 --onelinebanner//
        if (gameState === 'home') {
            const time = Date.now() / 1000;
            const logoBaseY = HEIGHT * 0.25;
            ctx.save();
            ctx.translate(WIDTH / 2, logoBaseY);

            // --- TEXT SECTION (TOP) ---
            ctx.save();

            // Text "ONE LINE"
            ctx.font = `900 ${isMobile ? '42px' : '56px'} 'Orbitron', monospace`;
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 6;
            ctx.strokeText('ONE LINE', 0, 0);
            ctx.fillStyle = '#ffcc00';
            ctx.fillText('ONE LINE', 0, 0);

            // Text "DRAW"
            ctx.translate(0, isMobile ? 50 : 65);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 8;
            ctx.strokeText('DRAW', 0, 0);

            // Static Glow for "DRAW"
            ctx.fillStyle = '#ff5555'; ctx.fillText('DRAW', 0, 0);
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255,85,85,0.4)';
            ctx.fillText('DRAW', 0, 0);
            ctx.restore();

            // --- UNIQUE ANIMATED BOX LOGO ---
            const boxY = isMobile ? 120 : 160;
            const logoScale = isMobile ? 0.9 : 1.3;
            ctx.save();
            ctx.translate(0, boxY);

            // Kinetic movement
            ctx.translate(0, Math.sin(time * 1.5) * 12);
            ctx.rotate(Math.sin(time * 0.5) * 0.05);

            // Box dimensions
            const bw = 140 * logoScale, bh = 100 * logoScale;
            const bX = -bw / 2, bY = -bh / 2;

            // Define point positions
            const TL = { x: bX, y: bY };
            const TR = { x: bX + bw, y: bY };
            const BR = { x: bX + bw, y: bY + bh };
            const BL = { x: bX, y: bY + bh };
            const CTR = { x: 0, y: 0 };

            // Eulerian path for the box with X (repeating as needed for visual)
            const logoPath = [TL, BL, BR, TR, TL, BR, CTR, BL, TR];
            const drawProgress = (time * 1.5) % (logoPath.length + 2);

            // Silhouette / Background Glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(100, 180, 255, 0.3)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 8 * G_SCALE;
            ctx.beginPath();
            logoPath.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.stroke();

            // Animated drawing path
            logoPath.forEach((p, i) => {
                if (i === 0) return;
                const segmentProgress = Math.max(0, Math.min(1, drawProgress - i));
                if (segmentProgress <= 0) return;

                const prev = logoPath[i - 1];
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);

                // Color logic: Highlight the top edge (TR-TL or TL-TR)
                const isTopEdge = (prev === TR && p === TL) || (prev === TL && p === TR);
                ctx.strokeStyle = isTopEdge ? '#ff9900' : '#ffffff';
                ctx.lineWidth = (isTopEdge ? 5 : 4) * G_SCALE;
                ctx.lineCap = 'round';
                ctx.shadowBlur = isTopEdge ? 15 : 10;
                ctx.shadowColor = isTopEdge ? '#ff9900' : '#ffffff';

                ctx.lineTo(prev.x + (p.x - prev.x) * segmentProgress, prev.y + (p.y - prev.y) * segmentProgress);
                ctx.stroke();
            });

            // Draw nodes at corner points
            [TL, TR, BR, BL, CTR].forEach((p, idx) => {
                const nodeVisibility = Math.max(0, Math.min(1, drawProgress - (idx < 4 ? idx + 1 : 6)));
                if (nodeVisibility <= 0) return;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.scale(nodeVisibility, nodeVisibility);
                ctx.fillStyle = '#00d4ff';
                ctx.beginPath();
                ctx.arc(0, 0, 6 * G_SCALE, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 * G_SCALE;
                ctx.stroke();
                ctx.restore();
            });

            ctx.restore();
            ctx.restore();

            // --- PREMIUM START BUTTON ---
            const btnW = isMobile ? 120 : 160, btnH = isMobile ? 45 : 60;
            const btnY = HEIGHT * 0.78;
            ctx.save();
            ctx.translate(WIDTH / 2, btnY);

            const pulse = Math.sin(time * 3) * 0.03 + 1;
            ctx.shadowBlur = 15 * pulse;
            ctx.shadowColor = 'rgba(100, 180, 255, 0.3)';

            ctx.beginPath();
            ctx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);

            // Background matching: subtle dark gradient
            const bg = ctx.createLinearGradient(0, -btnH / 2, 0, btnH / 2);
            bg.addColorStop(0, 'rgba(20, 30, 60, 0.4)');
            bg.addColorStop(1, 'rgba(6, 6, 16, 0.6)');
            ctx.fillStyle = bg;
            ctx.fill();

            // Border for visibility
            ctx.strokeStyle = 'rgba(100, 180, 255, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = `700 ${isMobile ? '16px' : '22px'} 'Orbitron', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('START', 0, 0);
            ctx.restore();
            return;
        }

        {/* Level Select */ }
        if (gameState === 'levelSelect') {
            const cols = isMobile ? 4 : 5;
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.font = `900 ${isMobile ? '28px' : '44px'} 'Orbitron', monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('SELECT LEVEL', WIDTH / 2, isMobile ? 65 : 85);

            const cardW = isMobile ? Math.min(58, WIDTH / (cols + 1.2)) : 85;
            const cardH = cardW, gapX = isMobile ? 12 : 24;
            const totalW = (cardW * cols) + (gapX * (cols - 1));
            const startX = WIDTH / 2 - totalW / 2 + cardW / 2;
            const startY = isMobile ? 130 : 190;

            const levelsPerPage = 20;
            const levelsToShow = levels.slice(levelSelectPage * levelsPerPage, (levelSelectPage + 1) * levelsPerPage);

            levelsToShow.forEach((lvl, sIdx) => {
                const idx = sIdx + levelSelectPage * levelsPerPage;
                const ix = sIdx % cols, iy = Math.floor(sIdx / cols);
                const x = startX + ix * (cardW + gapX), y = startY + iy * (cardH + gapX);
                const isUnlocked = idx <= maxUnlockedLevel, isCompleted = idx < maxUnlockedLevel;
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 14);
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
                ctx.lineWidth = 1.5; ctx.stroke();

                if (!isUnlocked) {
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.font = isMobile ? '22px Arial' : '30px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🔒', x, y);
                } else {
                    ctx.fillStyle = '#fff';
                    ctx.font = `900 ${isMobile ? '22px' : '28px'} 'Orbitron', monospace`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(idx + 1, x, y);
                    if (isCompleted) {
                        const ck = isMobile ? 7 : 10, off = cardW / 2 - ck - 4;
                        ctx.beginPath();
                        ctx.arc(x + off, y + off, ck, 0, Math.PI * 2);
                        const cg2 = ctx.createRadialGradient(x + off, y + off, 0, x + off, y + off, ck);
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
                        ctx.moveTo(x + off - ck * 0.4, y + off);
                        ctx.lineTo(x + off - ck * 0.1, y + off + ck * 0.45);
                        ctx.lineTo(x + off + ck * 0.5, y + off - ck * 0.35);
                        ctx.stroke();
                    }
                }
                ctx.restore();
            });

            // ---24-02  BLUE ARROW BUTTON ON THE RIGHT (TOGGLE PAGE) ---
            const gridRight = startX + (cols - 1) * (cardW + gapX) + cardW / 2;
            const arrowX = gridRight + (isMobile ? 31 : 55);
            const arrowY = startY + (isMobile ? 2 : 1.5) * (cardH + gapX);

            ctx.save();
            ctx.translate(arrowX, arrowY);

            const pulseTime = Date.now() / 1000;
            const pulse = Math.sin(pulseTime * 2.5) * 0.12 + 1;

            // Outer glow ring
            const bgR = isMobile ? 24 : 34;
            ctx.beginPath();
            ctx.arc(0, 0, bgR * pulse + 4, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.15 + Math.sin(pulseTime * 2.5) * 0.08})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Main circle background
            ctx.beginPath();
            ctx.arc(0, 0, bgR, 0, Math.PI * 2);
            const cardBg = ctx.createRadialGradient(0, -bgR * 0.3, 0, 0, 0, bgR);
            cardBg.addColorStop(0, 'rgba(30, 100, 200, 0.35)');
            cardBg.addColorStop(0.6, 'rgba(10, 60, 140, 0.25)');
            cardBg.addColorStop(1, 'rgba(5, 20, 60, 0.2)');
            ctx.fillStyle = cardBg;
            ctx.fill();
            ctx.strokeStyle = 'rgba(80, 180, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw chevron arrow (always pointing right)
            ctx.rotate(0);
            const sz = isMobile ? 14 : 20;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Arrow shadow/glow
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(0, 210, 255, 0.9)';

            // Double chevron for unique look
            // First chevron (back)
            ctx.beginPath();
            ctx.moveTo(-sz * 0.15, -sz * 0.6);
            ctx.lineTo(sz * 0.45, 0);
            ctx.lineTo(-sz * 0.15, sz * 0.6);
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Second chevron (front)
            ctx.beginPath();
            ctx.moveTo(-sz * 0.5, -sz * 0.6);
            ctx.lineTo(sz * 0.1, 0);
            ctx.lineTo(-sz * 0.5, sz * 0.6);
            const aGrad = ctx.createLinearGradient(-sz, -sz, sz, sz);
            aGrad.addColorStop(0, '#00e5ff');
            aGrad.addColorStop(1, '#4facfe');
            ctx.strokeStyle = aGrad;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.restore();

            // ---24-02  BLUE ARROW BUTTON ON THE LEFT (TOGGLE PAGE) ---
            const gridLeft = startX - cardW / 2;
            const leftArrowX = gridLeft - (isMobile ? 31 : 55);

            ctx.save();
            ctx.translate(leftArrowX, arrowY);

            // Outer glow ring
            ctx.beginPath();
            ctx.arc(0, 0, bgR * pulse + 4, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.15 + Math.sin(pulseTime * 2.5) * 0.08})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Main circle background
            ctx.beginPath();
            ctx.arc(0, 0, bgR, 0, Math.PI * 2);
            const leftBg = ctx.createRadialGradient(0, -bgR * 0.3, 0, 0, 0, bgR);
            leftBg.addColorStop(0, 'rgba(30, 100, 200, 0.35)');
            leftBg.addColorStop(0.6, 'rgba(10, 60, 140, 0.25)');
            leftBg.addColorStop(1, 'rgba(5, 20, 60, 0.2)');
            ctx.fillStyle = leftBg;
            ctx.fill();
            ctx.strokeStyle = 'rgba(80, 180, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw left chevron (always pointing left)
            ctx.rotate(Math.PI);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(0, 210, 255, 0.9)';

            // Double chevron - back
            ctx.beginPath();
            ctx.moveTo(-sz * 0.15, -sz * 0.6);
            ctx.lineTo(sz * 0.45, 0);
            ctx.lineTo(-sz * 0.15, sz * 0.6);
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Double chevron - front
            ctx.beginPath();
            ctx.moveTo(-sz * 0.5, -sz * 0.6);
            ctx.lineTo(sz * 0.1, 0);
            ctx.lineTo(-sz * 0.5, sz * 0.6);
            const lGrad = ctx.createLinearGradient(-sz, -sz, sz, sz);
            lGrad.addColorStop(0, '#00e5ff');
            lGrad.addColorStop(1, '#4facfe');
            ctx.strokeStyle = lGrad;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.restore();

            return;
        }


        // HUD
        const hudY = isMobile ? 28 : 55;
        const hudScale = isSmallMobile ? 0.65 : (isMobile ? 0.78 : 1);
        const homeX = isMobile ? (isSmallMobile ? 25 : 35) : 50;

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
        ctx.moveTo(-10, 5);
        ctx.lineTo(-10, -5);
        ctx.lineTo(0, -15);
        ctx.lineTo(10, -5);
        ctx.lineTo(10, 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(100,180,255,0.4)';
        ctx.fillRect(-3, -2, 6, 7);
        ctx.restore();

        const progressX = isMobile ? (WIDTH / 2 - 105 * hudScale) : (isTablet ? WIDTH * 0.22 : WIDTH * 0.35);
        const livesX = isMobile ? (WIDTH / 2 + 130 * hudScale) : (isTablet ? WIDTH * 0.82 : WIDTH * 0.75);

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
                ctx.font = `700 ${isMobile ? 20 : 20}px 'Orbitron', monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, 0, 2);
            }
            ctx.restore();
        };

        drawPill(progressX, hudY, 130, 50, `${edgesDrawn.size}/${targetEdges.length}`);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `700 ${isMobile ? '18px' : '26px'} 'Orbitron', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(currentLevelData.name, WIDTH / 2, isMobile ? hudY + 70 * hudScale : hudY + 10);
        drawPill(livesX, hudY, 160, 50, '');
        ctx.save();
        ctx.translate(livesX, hudY);
        ctx.scale(hudScale, hudScale);
        for (let i = 0; i < 3; i++) {
            const px = -40 + i * 40, isFilled = i < lives;
            ctx.beginPath(); ctx.arc(px, 0, 13, 0, Math.PI * 2);
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
        }
        ctx.restore();

        targetEdges.forEach(([from, to]) => {
            const edgeKey = `${Math.min(from, to)}-${Math.max(from, to)}`;
            if (!edgesDrawn.has(edgeKey)) {
                ctx.strokeStyle = 'rgba(150,170,220,0.2)';
                ctx.lineWidth = 14 * G_SCALE;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(nodes[from].x, nodes[from].y);
                ctx.lineTo(nodes[to].x, nodes[to].y);
                ctx.stroke();
            }
        });

        if (drawnPath.length > 0) {
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
            ctx.save();
            ctx.shadowBlur = isWinAnimating ? 0 : 18 * G_SCALE;
            ctx.shadowColor = 'rgba(100,180,255,0.6)';
            ctx.strokeStyle = isWinAnimating ? '#00ffaa' : 'rgba(100,180,255,0.9)';
            ctx.lineWidth = 14 * G_SCALE; ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(drawnPath[0].x, drawnPath[0].y);
            for (let i = 1; i < drawnPath.length; i++) ctx.lineTo(drawnPath[i].x, drawnPath[i].y);
            if (currentPos && drawing) ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke(); ctx.restore();
            ctx.strokeStyle = isWinAnimating ? 'rgba(200,255,230,0.9)' : 'rgba(220,240,255,0.6)';
            ctx.lineWidth = 4 * G_SCALE; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(drawnPath[0].x, drawnPath[0].y);
            for (let i = 1; i < drawnPath.length; i++) ctx.lineTo(drawnPath[i].x, drawnPath[i].y);
            if (currentPos && drawing) ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke();
        }

        nodes.forEach((node, idx) => {
            const isVisited = drawnPath.some(p => p.nodeId === idx);
            const isCurrent = drawnPath.length > 0 && drawnPath[drawnPath.length - 1].nodeId === idx;
            if (isCurrent) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, 38 * G_SCALE, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(100,180,255,0.15)';
                ctx.fill();
            }
            ctx.save();
            ctx.shadowBlur = isVisited ? 20 * G_SCALE : 10 * G_SCALE;
            ctx.shadowColor = isVisited ? 'rgba(100,220,180,0.8)' : 'rgba(100,160,255,0.5)';
            ctx.beginPath();
            ctx.arc(node.x, node.y, 22 * G_SCALE, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(10,20,50,0.8)';
            ctx.fill();
            ctx.strokeStyle = isVisited ? 'rgba(100,220,180,0.9)' : 'rgba(100,160,255,0.7)';
            ctx.lineWidth = 2.5 * G_SCALE;
            ctx.stroke(); ctx.restore();
            const innerR = 16 * G_SCALE;
            const ng = ctx.createRadialGradient(node.x - 4 * G_SCALE, node.y - 4 * G_SCALE, 1, node.x, node.y, innerR);
            if (isVisited) {
                ng.addColorStop(0, '#80ffcc');
                ng.addColorStop(1, '#00aa77');
            }
            else {
                ng.addColorStop(0, '#80b4ff');
                ng.addColorStop(1, '#2255cc');
            }
            ctx.beginPath();
            ctx.arc(node.x, node.y, innerR, 0, Math.PI * 2);
            ctx.fillStyle = ng;
            ctx.fill();
        });
    };

    // ✅ FIX 5: getMousePos - handle both touch and mouse correctly
    const getMousePos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const getNodeAtPos = (pos) => nodes.findIndex(node => Math.sqrt(Math.pow(pos.x - node.x, 2) + Math.pow(pos.y - node.y, 2)) < 45);
    const checkEdgeExists = (from, to) => targetEdges.some(([a, b]) => (a === from && b === to) || (a === to && b === from));

    const handleMouseDown = (e) => {
        const pos = getMousePos(e);
        const hudY = isMobile ? 28 : 55;
        const hudScale = isSmallMobile ? 0.65 : (isMobile ? 0.78 : 1);
        const homeX = isMobile ? (isSmallMobile ? 25 : 35) : 50;
        const isHome = Math.sqrt(Math.pow(pos.x - homeX, 2) + Math.pow(pos.y - hudY, 2)) < (30 * hudScale);
        if (isHome) {
            if (gameState === 'home') setGameState('levelSelect');
            else if (gameState === 'levelSelect') setGameState('home');
            else setGameState('levelSelect');
            return;
        }
        if (gameState === 'home') {
            const btnW = isMobile ? 120 : 160, btnH = isMobile ? 45 : 60, btnY = HEIGHT * 0.78;
            if (pos.x >= WIDTH / 2 - btnW / 2 && pos.x <= WIDTH / 2 + btnW / 2 && pos.y >= btnY - btnH / 2 && pos.y <= btnY + btnH / 2) {
                setGameState('levelSelect');
            }
            return;
        }

        {/* Level Select */ }
        if (gameState === 'levelSelect') {
            const cols = isMobile ? 4 : 5;
            const cardW = isMobile ? Math.min(58, WIDTH / (cols + 1.2)) : 85;
            const cardH = cardW, gapX = isMobile ? 12 : 24;
            const totalW = (cardW * cols) + (gapX * (cols - 1));
            const startX = WIDTH / 2 - totalW / 2 + cardW / 2;
            const startY = isMobile ? 130 : 190;
            const levelsPerPage = 20;
            const levelsToShow = levels.slice(levelSelectPage * levelsPerPage, (levelSelectPage + 1) * levelsPerPage);

            levelsToShow.forEach((lvl, sIdx) => {
                const idx = sIdx + levelSelectPage * levelsPerPage;
                const ix = sIdx % cols, iy = Math.floor(sIdx / cols);
                const x = startX + ix * (cardW + gapX), y = startY + iy * (cardH + gapX);
                if (pos.x >= (x - cardW / 2) && pos.x <= (x + cardW / 2) && pos.y >= (y - cardH / 2) && pos.y <= (y + cardH / 2)) {
                    if (idx <= maxUnlockedLevel) {
                        setCurrentLevel(idx);
                        setGameState('playing');
                        setDrawnPath([]);
                        setEdgesDrawn(new Set());
                        setLives(3);
                        setMessage({ text: '', type: '' });
                    }
                }
            });

            // --- 24-02 HIT DETECTION FOR BLUE ARROW BUTTON (TOGGLE PAGE) ---
            const gridRight = startX + (cols - 1) * (cardW + gapX) + cardW / 2;
            const arrowX = gridRight + (isMobile ? 31 : 55);
            const arrowY = startY + (isMobile ? 2 : 1.5) * (cardH + gapX);

            if (levelSelectPage === 0 && Math.sqrt(Math.pow(pos.x - arrowX, 2) + Math.pow(pos.y - arrowY, 2)) < 40) {
                setLevelSelectPage(1);
            }

            // --- 24-02 HIT DETECTION FOR LEFT ARROW BUTTON ---
            const gridLeft = startX - cardW / 2;
            const leftArrowX = gridLeft - (isMobile ? 31 : 55);

            if (levelSelectPage > 0 && Math.sqrt(Math.pow(pos.x - leftArrowX, 2) + Math.pow(pos.y - arrowY, 2)) < 40) {
                setLevelSelectPage(levelSelectPage - 1);
            }
            return;
        }
        if (lives <= 0) return;
        const nodeIdx = getNodeAtPos(pos);
        if (nodeIdx !== -1) {
            if (drawnPath.length > 0 && nodeIdx === drawnPath[drawnPath.length - 1].nodeId) { setDrawing(true); return; }
            const node = nodes[nodeIdx];
            setDrawing(true);
            setDrawnPath([{ x: node.x, y: node.y, nodeId: nodeIdx }]);
            setCurrentPos({ x: node.x, y: node.y });
            setEdgesDrawn(new Set()); setMessage({ text: '', type: '' });
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
                const nl = Math.max(0, lives - 1); setLives(nl); setDrawing(false); setCurrentPos(null); setDrawnPath([]); setEdgesDrawn(new Set());
                if (nl === 0) setTimeout(() => setMessage({ text: '💔 Game Over! Click RETRY', type: 'lose' }), 500);
                return;
            }
            if (edgesDrawn.has(edgeKey)) {
                const nl = Math.max(0, lives - 1); setLives(nl); setDrawing(false); setCurrentPos(null); setDrawnPath([]); setEdgesDrawn(new Set());
                if (nl === 0) setTimeout(() => setMessage({ text: '💔 Game Over! Click RETRY', type: 'lose' }), 500);
                return;
            }
            if (drawnPath.length > 1 && nodeIdx === drawnPath[drawnPath.length - 2].nodeId) { handleUndo(); setDrawing(false); return; }
            const newPath = [...drawnPath, { x: nodes[nodeIdx].x, y: nodes[nodeIdx].y, nodeId: nodeIdx }];
            const newEdges = new Set(edgesDrawn); newEdges.add(edgeKey);
            setDrawnPath(newPath); setEdgesDrawn(newEdges);
            if (newEdges.size === targetEdges.length) { // 24-02 //
                setDrawing(false); setIsWinAnimating(true);
                setTimeout(() => {
                    setIsWinAnimating(false);
                    setMessage({ text: '🎉 PERFECT! NEXT LEVEL...', type: 'win' });
                    const nextLevel = currentLevel + 1;
                    if (nextLevel <= levels.length && nextLevel > maxUnlockedLevel) setMaxUnlockedLevel(nextLevel); // 24-02 //
                }, 1000);
            }
        }
    };

    const handleMouseUp = () => {
        if (drawing && drawnPath.length > 0 && edgesDrawn.size > 0 && edgesDrawn.size < targetEdges.length) {
            const nl = Math.max(0, lives - 1); setLives(nl); setDrawnPath([]); setEdgesDrawn(new Set());
            if (nl === 0) setTimeout(() => setMessage({ text: '💔 Game Over! Click RETRY', type: 'lose' }), 500);
        }
        setDrawing(false); setCurrentPos(null);
    };

    const handleUndo = () => {
        if (drawnPath.length > 1) {
            const np = drawnPath.slice(0, -1); const ne = new Set();
            for (let i = 1; i < np.length; i++) { const f = np[i - 1].nodeId, t = np[i].nodeId; ne.add(`${Math.min(f, t)}-${Math.max(f, t)}`); }
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

    if (!storageLoaded) {
        return (
            <div style={{ width: '100vw', height: '100vh', background: '#060610', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ color: '#80aaff', fontFamily: 'monospace', fontSize: '20px' }}>Loading...</div>
            </div>
        );
    }


    return (
        <div style={{
            fontFamily: "'Orbitron', 'Outfit', monospace",
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            width: '100vw', height: '100vh', overflow: 'hidden',
            position: 'fixed', top: 0, left: 0,
            background: '#060610'
        }}>
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Outfit:wght@400;500;700;900&display=swap" rel="stylesheet" />

            <canvas ref={bgCanvasRef} width={WIDTH} height={HEIGHT}
                style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} />

            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)', zIndex: 1, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)', zIndex: 1, pointerEvents: 'none' }} />

            <style>{`
                @keyframes bannerPop { 0% { transform: translate(-50%,-50%) scale(0.8); opacity:0; } 100% { transform: translate(-50%,-50%) scale(1); opacity:1; } }
                @keyframes starPop { 0% { transform: scale(0) rotate(-45deg); opacity:0; } 70% { transform: scale(1.2) rotate(10deg); opacity:1; } 100% { transform: scale(1) rotate(0deg); opacity:1; } }
                @keyframes floatWin { 0%, 100% { transform: translate(-50%, -50%); } 50% { transform: translate(-50%, -54%); } }
                @keyframes shineBtn { 0% { left: -100%; } 100% { left: 100%; } }
                * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
                body { margin: 0; overflow: hidden; }
            `}</style>

            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                onTouchStart={(e) => { e.preventDefault(); handleMouseDown(e.touches[0]); }}
                onTouchMove={(e) => { e.preventDefault(); handleMouseMove(e.touches[0]); }}
                onTouchEnd={(e) => { e.preventDefault(); handleMouseUp(); }}
                style={{ background: 'transparent', display: 'block', cursor: drawing ? 'crosshair' : 'pointer', position: 'relative', zIndex: 2, touchAction: 'none', userSelect: 'none' }}
            />


            {/* 24-02 -- Message Overlay win/lose*/}
            {message.text && (
                <>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,5,15,0.85)', backdropFilter: 'blur(10px)', zIndex: 9 }} />
                    <div style={message.type === 'win' ? { // 24-02 //
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%,-50%)',
                        width: isMobile ? '85%' : '420px',
                        padding: isMobile ? '35px 20px' : '60px 30px',
                        borderRadius: '35px',
                        background: 'linear-gradient(165deg, rgba(20, 40, 80, 0.96), rgba(5, 12, 25, 0.98))',
                        boxShadow: '0 25px 60px -15px rgba(0, 180, 255, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(0, 200, 255, 0.4)',
                        zIndex: 10, textAlign: 'center',
                        animation: 'bannerPop 0.5s cubic-bezier(0.2, 0.8, 0.2, 1.15) forwards, floatWin 4s ease-in-out infinite 0.5s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px',
                        overflow: 'hidden'
                    } : {
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%,-50%)',
                        width: isMobile ? '75%' : '85%', maxWidth: '420px',
                        padding: isMobile ? '20px 18px' : '44px 28px 36px',
                        borderRadius: isMobile ? '18px' : '24px',
                        background: 'linear-gradient(135deg, rgba(40,0,20,0.95), rgba(30,0,30,0.98))',
                        boxShadow: '0 0 40px rgba(255,50,50,0.2)',
                        border: '1px solid rgba(255,50,100,0.3)',
                        zIndex: 10, textAlign: 'center',
                        animation: 'bannerPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '10px' : '16px'
                    }}>
                        {message.type === 'win' ? ( // 24-02 //
                            <>
                                <div style={{
                                    width: isMobile ? '70px' : '90px', height: isMobile ? '70px' : '90px',
                                    borderRadius: '24px',
                                    background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    fontSize: isMobile ? '34px' : '44px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                                    transform: 'rotate(-6deg) translateY(-4px)',
                                    border: '3px solid rgba(255,255,255,0.3)'
                                }}>🏆</div>
                                <div>
                                    <h2 style={{ fontSize: isMobile ? '24px' : '32px', margin: 0, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: '4px', textShadow: '0 0 15px rgba(0, 200, 255, 0.7)' }}>VICTORY!</h2>
                                    <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#a0f0ff', fontWeight: '500', opacity: 0.9 }}>LEVEL COMPLETED SUCCESSFULLY</p>
                                </div>
                                <div style={{ display: 'flex', gap: '14px' }}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} style={{ animation: `starPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards ${i * 0.15 + 0.3}s`, opacity: 0, fontSize: i === 2 ? '38px' : '26px', filter: 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.8))' }}>⭐</div>
                                    ))}
                                </div>
                                <button onClick={handleNextLevel} style={{
                                    position: 'relative', marginTop: '12px', padding: '16px 50px',
                                    background: '#fff', color: '#050a14', borderRadius: '18px',
                                    fontWeight: '900', fontSize: '16px', fontFamily: "'Orbitron', monospace",
                                    letterSpacing: '2px', border: 'none', cursor: 'pointer', overflow: 'hidden',
                                    boxShadow: '0 10px 30px rgba(0,200,255,0.3)', transition: 'transform 0.2s'
                                }}>
                                    <span style={{ position: 'relative', zIndex: 2 }}>NEXT LEVEL ➔</span>
                                    <div style={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', animation: 'shineBtn 3s infinite', zIndex: 1 }} />
                                </button>
                            </>
                        ) : (
                            <>
                                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: '2px', background: 'linear-gradient(90deg, transparent, #ff4488, transparent)', borderRadius: '2px' }} />
                                <div style={{ width: isMobile ? '50px' : '80px', height: isMobile ? '50px' : '80px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,50,100,0.2), rgba(200,0,50,0.1))', border: '2px solid rgba(255,50,100,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: isMobile ? '24px' : '36px' }}>💔</div>
                                <div style={{ fontSize: isMobile ? '18px' : '28px', fontWeight: '900', color: '#ff88aa', fontFamily: "'Orbitron', monospace", letterSpacing: '2px', textShadow: '0 0 20px rgba(255,50,100,0.5)' }}>GAME OVER</div>
                                <div onClick={handleRetry} style={{ padding: isMobile ? '10px 28px' : '14px 36px', background: 'linear-gradient(135deg, #ff4466, #cc0044)', color: '#fff', borderRadius: '50px', fontWeight: '700', fontSize: isMobile ? '13px' : '15px', fontFamily: "'Orbitron', monospace", letterSpacing: '1px', boxShadow: '0 4px 16px rgba(255,50,100,0.4)', cursor: 'pointer', border: 'none' }}>TRY AGAIN ↻</div>
                            </>
                        )}
                    </div>
                </>
            )}


            {/* 19-02 -- Mobile Landscape Error Overlay */}
            {
                isMobileDevice && isLandscape && (
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
                        }}>📱</div>
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
                )
            }
        </div >
    );
}