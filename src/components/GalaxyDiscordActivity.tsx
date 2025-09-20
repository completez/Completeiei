import cosmicDreamsCover from "@/assets/cosmic-dreams-cover.jpg";
import stellarJourneyCover from "@/assets/stellar-journey-cover.jpg";
import nebulaNightsCover from "@/assets/nebula-nights-cover.jpg";

"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Headphones,
  Activity,
  Zap,
} from "lucide-react";

// 3D / WebGL
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";

// Types
interface DiscordActivity {
  type: number;
  id: string;
  name: string;
  details?: string;
  state?: string;
  sync_id?: string;
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  timestamps?: { start?: number };
  application_id?: string;
}

interface DiscordData {
  discord_user: {
    id: string;
    username: string;
    display_name: string;
    avatar: string;
  };
  activities: DiscordActivity[];
  discord_status: string;
}

// Discord User ID to track
const DISCORD_USER_ID = "765897415492239390";

// Starfield Component
function Stars({ count = 5000 }) {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const r = THREE.MathUtils.randFloat(20, 200);
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const phi = THREE.MathUtils.randFloat(0, Math.PI);
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      positions.set([x, y, z], i * 3);
      
      // Randomize star colors (white to purple)
      const intensity = THREE.MathUtils.randFloat(0.5, 1);
      colors.set([intensity, intensity * 0.9, intensity], i * 3);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [count]);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.8,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      opacity: 0.8,
    });
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    state.scene.rotation.y = Math.sin(t * 0.1) * 0.05;
  });

  return <points geometry={points} material={material} />;
}

// Nebula Clouds
function NebulaCloud({ position, color, size = 25 }: { position: [number, number, number]; color: string; size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, [color]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.rotation.z = Math.sin(t * 0.2) * 0.3;
      meshRef.current.position.y = position[1] + Math.sin(t * 0.1) * 2;
    }
  });

  return (
    <Float speed={0.5} rotationIntensity={0.2} floatIntensity={1}>
      <mesh ref={meshRef} position={position}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial 
          map={texture} 
          transparent 
          opacity={0.6} 
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </Float>
  );
}

// Central Galaxy Core
function GalaxyCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005;
      meshRef.current.rotation.y += 0.01;
    }
    if (materialRef.current) {
      const t = clock.getElapsedTime();
      materialRef.current.emissiveIntensity = 0.8 + Math.sin(t * 2) * 0.3;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={1} floatIntensity={3}>
      <mesh ref={meshRef} position={[0, 0, -30]}>
        <torusKnotGeometry args={[3, 1, 256, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color={new THREE.Color("#8b5cf6")}
          emissive={new THREE.Color("#7c3aed")}
          metalness={0.1}
          roughness={0.2}
        />
      </mesh>
    </Float>
  );
}

// Shooting Stars Overlay
function ShootingStarsOverlay() {
  const stars = useMemo(() => 
    new Array(12).fill(0).map((_, i) => ({
      id: i,
      top: `${Math.random() * 70 + 10}%`,
      left: `${Math.random() * 80 + 10}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${6 + Math.random() * 6}s`,
    })), []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <span
          key={star.id}
          className="shooting-star"
          style={{
            top: star.top,
            left: star.left,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}
    </div>
  );
}

// Main Component
export default function GalaxyDiscordActivity() {
  const canRender3D = typeof window !== "undefined";
  
  // Discord Data State
  const [data, setData] = useState<DiscordData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Spotify State
  const [spotifyTrack, setSpotifyTrack] = useState<{
    song: string;
    artist: string;
    albumArt: string;
    url: string;
  } | null>(null);

  // Music Player State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playlist = [
    {
      title: "G2ดิว่ะ!! ท้ายอาภัพรัก x ร้านเคลิ้ม",
      artist: "DJ G2 x MC MAXKY",
      cover: "./public/covers/G2.jpeg",
      src: "./public/music/G2.mp3",
    },
    {
      title: "รักแรกพบ",
      artist: "TATTOO COLOR",
      cover: "./public/covers/TATTOOCOLOUR.jpg",
      src: "./public/music/TATTOOCOLOUR.mp3",
    },
    {
      title: "YUNGTARR - Resetment",
      artist: "YUNGTARR",
      cover: "./public/covers/hq720 (2).jpg",
      src: "./public/music/YUNGTARR.mp3",
    },
  ];
  const currentTrack = playlist[currentIndex];

  // Music Controls
  const nextTrack = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  }, [playlist.length]);

  const prevTrack = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? playlist.length - 1 : prev - 1));
  }, [playlist.length]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (audio.paused) {
      audio.play().catch((e) => console.error("Play failed:", e));
    } else {
      audio.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Discord Data Fetching
  useEffect(() => {
    setMounted(true);

    let pollId: number | null = null;
    let ws: WebSocket | null = null;
    let heartbeatId: number | null = null;
    let reconnectTimer: number | null = null;

    async function fetchData() {
      try {
        setError(null);
        const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          setIsConnected(true);
        } else {
          throw new Error("Invalid response from Lanyard API");
        }
      } catch (e) {
        console.error("Failed to fetch Discord data:", e);
        setError(e instanceof Error ? e.message : "Failed to fetch data");
        setIsConnected(false);
      }
    }

    const connectWebSocket = () => {
      try {
        ws = new WebSocket("wss://api.lanyard.rest/socket");
        
        ws.onopen = () => {
          ws?.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }));
          heartbeatId = window.setInterval(() => {
            try {
              ws?.send(JSON.stringify({ op: 3 }));
            } catch {}
          }, 30000);
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.t === "INIT_STATE" || message.t === "PRESENCE_UPDATE") {
            if (message.d) {
              setData(message.d);
              setIsConnected(true);
              setError(null);
            }
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (heartbeatId) clearInterval(heartbeatId);
          reconnectTimer = window.setTimeout(connectWebSocket, 3000);
        };
      } catch (e) {
        console.error("WebSocket connection failed:", e);
        setIsConnected(false);
      }
    };

    fetchData();
    connectWebSocket();
    pollId = window.setInterval(fetchData, 15000);

    return () => {
      if (pollId) clearInterval(pollId);
      if (heartbeatId) clearInterval(heartbeatId);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // Parse Spotify data
  useEffect(() => {
    if (!data) return;
    
    const spotify = data.activities.find((a) => a.name === "Spotify");
    if (spotify) {
      const albumId = spotify.assets?.large_image?.replace("spotify:", "") || "";
      setSpotifyTrack({
        song: spotify.details || "Unknown",
        artist: spotify.state || "",
        albumArt: `https://i.scdn.co/image/${albumId}`,
        url: `https://open.spotify.com/track/${spotify.sync_id}`,
      });
    } else {
      setSpotifyTrack(null);
    }
  }, [data]);

  // Audio controls
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => nextTrack();

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [nextTrack]);

  const VolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="w-5 h-5" />;
    if (volume < 0.5) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  // Loading State
  if (!mounted || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-card"></div>
        
        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute top-2 left-2 w-16 h-16 border-2 border-accent/20 border-b-accent rounded-full animate-spin [animation-direction:reverse]"></div>
          </div>
          
          <motion.div
            className="space-y-3"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Connecting to the Galaxy
            </h2>
            <p className="text-muted-foreground">
              {error ? "Connection failed - Retrying..." : "Establishing cosmic link..."}
            </p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm max-w-sm mx-auto"
            >
              {error}
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  const activities = data.activities.filter((a) => a.type !== 4 && a.name !== "Spotify");

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* 3D Galaxy Background */}
      <div className="absolute inset-0 -z-10">
        {canRender3D && (
          <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} intensity={0.8} />
            <Stars />
            <NebulaCloud position={[-20, 10, -40]} color="rgba(139, 92, 246, 0.4)" size={30} />
            <NebulaCloud position={[15, -8, -35]} color="rgba(236, 72, 153, 0.3)" size={25} />
            <NebulaCloud position={[0, 15, -50]} color="rgba(59, 130, 246, 0.2)" size={35} />
            <GalaxyCore />
            <OrbitControls 
              enableZoom={false} 
              enablePan={false} 
              autoRotate 
              autoRotateSpeed={0.5}
            />
          </Canvas>
        )}
        <ShootingStarsOverlay />
      </div>

      {/* Main Content */}
      <motion.div
        className="relative z-10 w-full max-w-lg mx-auto"
        initial={{ opacity: 0, y: 50, rotateX: 15 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="glass-panel rounded-3xl p-8 space-y-8 float-cosmic">
          {/* Connection Status */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-error'}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* User Profile */}
          <motion.div 
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="relative inline-block">
              <motion.div
                className="absolute -inset-2 bg-gradient-to-r from-primary to-accent rounded-full blur-lg opacity-60"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20">
                <img
                  src={`https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.png?size=256`}
                  alt="Discord Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background ${
                data.discord_status === "online" ? "bg-success" :
                data.discord_status === "dnd" ? "bg-error" :
                data.discord_status === "idle" ? "bg-warning" : "bg-muted"
              }`} />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                {data.discord_user.display_name}
              </h1>
              <p className="text-muted-foreground">@{data.discord_user.username}</p>
            </div>
          </motion.div>

          {/* Spotify Section */}
          <AnimatePresence>
            {spotifyTrack && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                className="glass-panel rounded-2xl p-4 border border-success/30"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden">
                    <img 
                      src={spotifyTrack.albumArt} 
                      alt="Album Art" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Headphones className="w-4 h-4 text-success" />
                      <span className="text-success text-sm font-medium">Spotify</span>
                    </div>
                    <h3 className="font-semibold truncate">{spotifyTrack.song}</h3>
                    <p className="text-sm text-muted-foreground truncate">{spotifyTrack.artist}</p>
                  </div>
                  <a
                    href={spotifyTrack.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cosmic px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    Open
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Music Player */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-center space-y-4">
              <motion.div
                key={currentTrack.cover}
                className="w-48 h-48 mx-auto rounded-2xl overflow-hidden shadow-2xl"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <img
                  src={currentTrack.cover}
                  alt="Track Cover"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              
              <div>
                <h2 className="text-xl font-bold text-foreground">{currentTrack.title}</h2>
                <p className="text-muted-foreground">{currentTrack.artist}</p>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3">
              <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground">
                <VolumeIcon />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>

            {/* Playback Controls */}
            <div className="flex justify-center items-center gap-6">
              <motion.button
                onClick={prevTrack}
                className="text-muted-foreground hover:text-foreground"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={!!spotifyTrack}
              >
                <SkipBack className="w-6 h-6" />
              </motion.button>
              
              <motion.button
                onClick={togglePlay}
                className="btn-cosmic p-4 rounded-full disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!!spotifyTrack}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </motion.button>
              
              <motion.button
                onClick={nextTrack}
                className="text-muted-foreground hover:text-foreground"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={!!spotifyTrack}
              >
                <SkipForward className="w-6 h-6" />
              </motion.button>
            </div>
          </motion.div>

          {/* Activities */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Current Activities</h3>
            </div>
            
            {activities.length > 0 ? (
              <div className="space-y-3 max-h-40 overflow-y-auto scrollbar-cosmic">
                {activities.map((activity) => (
                  <motion.div
                    key={activity.id}
                    className="glass-panel rounded-xl p-3 border border-primary/10"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-3">
                      {activity.assets?.large_image ? (
                        <img
                          src={`https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`}
                          alt="Activity"
                          className="w-10 h-10 rounded-lg"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{activity.name}</h4>
                        {activity.details && (
                          <p className="text-sm text-muted-foreground truncate">{activity.details}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/20 flex items-center justify-center">
                  <span className="text-3xl">😴</span>
                </div>
                <p className="text-muted-foreground">No activities detected</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Currently idle in the cosmos</p>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack.src}
        preload="metadata"
      />

      {/* Unmute Notification */}
      <AnimatePresence>
        {isMuted && isPlaying && (
          <motion.div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
          >
            <motion.button
              onClick={() => setIsMuted(false)}
              className="btn-cosmic px-6 py-3 rounded-full flex items-center gap-2 shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <VolumeX className="w-5 h-5" />
              <span className="font-medium">Click to Unmute</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}