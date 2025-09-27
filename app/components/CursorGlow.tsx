"use client";

import { useEffect, useState, useCallback, useRef } from 'react';

interface Particle {
  id: string; // Changed to string for better uniqueness
  x: number;
  y: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  color: string;
}

export default function CursorGlow() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mouseVelocity, setMouseVelocity] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [trail, setTrail] = useState<Array<{x: number, y: number, opacity: number}>>([]);
  const [animationTime, setAnimationTime] = useState(0);
  
  // Add a counter ref for unique IDs
  const particleIdCounter = useRef(0);

  // Create particles on mouse move
  const createParticles = useCallback((x: number, y: number, velocity: number) => {
    const particleCount = Math.min(2 + Math.floor(velocity * 0.15), 6);
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 1 + Math.random() * 3;
      const size = 2 + Math.random() * 4;
      
      // Generate unique ID using counter and random component
      particleIdCounter.current += 1;
      const uniqueId = `particle-${particleIdCounter.current}-${Math.random().toString(36).substr(2, 9)}`;
      
      newParticles.push({
        id: uniqueId,
        x: x + (Math.random() - 0.5) * 15,
        y: y + (Math.random() - 0.5) * 15,
        size: size,
        opacity: 0.9,
        life: 0,
        maxLife: 15 + Math.random() * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#FFFFFF'
      });
    }

    setParticles(prev => [...prev, ...newParticles].slice(-40)); // Limit particles
  }, []);

  // Animation loop for particles
  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      setAnimationTime(prev => prev + 1);
      
      setParticles(prev => 
        prev.map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          life: particle.life + 1,
          opacity: Math.max(0, 0.9 * (1 - particle.life / particle.maxLife)),
          vx: particle.vx * 0.96, // Less friction
          vy: particle.vy * 0.96
        })).filter(particle => particle.life < particle.maxLife)
      );

      // Update trail
      setTrail(prev => 
        prev.map(point => ({
          ...point,
          opacity: point.opacity * 0.88
        })).filter(point => point.opacity > 0.02)
      );
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [animationTime]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX;
      const newY = e.clientY;
      
      // Calculate velocity
      const vx = newX - lastMousePos.x;
      const vy = newY - lastMousePos.y;
      const velocity = Math.sqrt(vx * vx + vy * vy);
      
      setMousePosition({ x: newX, y: newY });
      setMouseVelocity({ x: vx, y: vy });
      setLastMousePos({ x: newX, y: newY });
      setIsVisible(true);

      // Add trail point
      setTrail(prev => [...prev, { x: newX, y: newY, opacity: 0.7 }].slice(-10));

      // Create particles based on velocity
      if (velocity > 1) {
        createParticles(newX, newY, velocity);
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [lastMousePos, createParticles]);

  const pulseScale = 1 + Math.sin(animationTime * 0.1) * 0.1;
  const rotationAngle = animationTime * 0.5;

  return (
    <>
      {/* Main cursor effects - COMMENTED OUT TO REMOVE RED GLOW */}
      {/* <div
        className="fixed inset-0 pointer-events-none z-5 transition-opacity duration-100"
        style={{
          opacity: isVisible ? 1 : 0,
          background: `
            radial-gradient(
              ${60 * pulseScale}px circle at ${mousePosition.x}px ${mousePosition.y}px,
              rgba(150, 59, 107, 0.8) 0%,
              rgba(150, 59, 107, 0.4) 30%,
              transparent 70%
            ),
            conic-gradient(
              from ${rotationAngle}deg at ${mousePosition.x}px ${mousePosition.y}px,
              transparent 0deg,
              rgba(139, 142, 188, 0.3) 60deg,
              transparent 120deg,
              rgba(150, 59, 107, 0.25) 180deg,
              transparent 240deg,
              rgba(139, 142, 188, 0.2) 300deg,
              transparent 360deg
            ),
            radial-gradient(
              ${200 + Math.abs(mouseVelocity.x) * 2}px ${200 + Math.abs(mouseVelocity.y) * 2}px at ${mousePosition.x}px ${mousePosition.y}px,
              rgba(150, 59, 107, 0.15) 0%,
              rgba(150, 59, 107, 0.05) 50%,
              transparent 80%
            ),
            radial-gradient(
              300px circle at ${mousePosition.x}px ${mousePosition.y}px,
              rgba(150, 59, 107, 0.1) 0%,
              rgba(139, 142, 188, 0.05) 60%,
              transparent 100%
            )
          `
        }}
      /> */}

      {/* Trail effect */}
      {trail.map((point, index) => (
        <div
          key={`trail-${index}-${animationTime}`}
          className="fixed pointer-events-none z-4"
          style={{
            left: point.x - 3,
            top: point.y - 3,
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(150, 59, 107, ${point.opacity}) 0%, transparent 70%)`,
            transform: `scale(${point.opacity})`,
            transition: 'all 0.05s ease-out'
          }}
        />
      ))}

      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="fixed pointer-events-none z-6"
          style={{
            left: particle.x - particle.size / 2,
            top: particle.y - particle.size / 2,
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${particle.color}${Math.floor(particle.opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}${Math.floor(particle.opacity * 128).toString(16).padStart(2, '0')}`,
            transform: `scale(${particle.opacity}) rotate(${particle.life * 10}deg)`,
            filter: 'blur(0.5px)'
          }}
        />
      ))}
    </>
  );
}