"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Play, Pause, SkipBack, SkipForward, User, Music, 
    Volume2, Volume1, VolumeX
} from "lucide-react";

// Interfaces
interface Activity {
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
    activities: Activity[];
    discord_status: string;
}

// Add user ID that you want to track
const DISCORD_USER_ID = "765897415492239390"; // Replace this with the target Discord user ID

const TABS = [
    { id: "profile", label: "Profile", icon: User },
    { id: "music", label: "Music", icon: Music },
];

export default function DiscordActivity() {
    // Data Fetching State
    const [data, setData] = useState<DiscordData | null>(null);
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
    const [volume, setVolume] = useState(0.75);
    const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playlist = [
        {
            title: "G2ดิว่ะ!! ท้ายอาภัพรัก x ร้านเคลิ้ม",
            artist: "DJ G2 x MC MAXKY",
            cover: "/covers/G2.jpeg",
            src: "/music/G2.mp3",
        },
        {
            title: "รักแรกพบ",
            artist: "TATTOO COLOR",
            cover: "/covers/TATTOOCOLOUR.jpg",
            src: "/music/TATTOOCOLOUR.mp3",
        },
        {
            title: "YUNGTARR - Resetment  ",
            artist: "YUNGTARR",
            cover: "/covers/hq720 (2).jpg",
            src: "/music/YUNGTARR.mp3",
        },
    ];
    const currentTrack = playlist[currentIndex];

    // Tab State
    const [activeTab, setActiveTab] = useState(TABS[0].id);
    
    // --- Music Player Controls (wrapped in useCallback for performance) ---
    const nextTrack = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % playlist.length);
    }, [playlist.length]);

    const prevTrack = useCallback(() => {
        setCurrentIndex((prev) => (prev === 0 ? playlist.length - 1 : prev - 1));
    }, [playlist.length]);

    const togglePlay = useCallback(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.error("Play failed:", e));
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);
    
    const selectTrack = useCallback((index: number) => {
        setCurrentIndex(index);
        if (!isPlaying) {
            setTimeout(() => {
                audioRef.current?.play().catch(e => console.error("Play failed:", e));
                setIsPlaying(true);
            }, 150)
        }
    }, [isPlaying]);
    
    const handleVolumeChange = useCallback((newVolume: number) => {
        setVolume(newVolume);
        if (newVolume > 0) {
            setIsMuted(false);
        }
    }, []);
    
    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    // --- useEffect Hooks ---

    // Effect for fetching Lanyard data (WebSocket and fallback)
    useEffect(() => {
        setMounted(true);
        
        async function fetchData() {
            try {
                setError(null);
                const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                const json = await res.json();
                if (json.success && json.data) {
                    setData(json.data);
                    setLastUpdated(new Date());
                    setIsConnected(true);
                } else {
                    throw new Error('Invalid response from Lanyard API');
                }
            } catch (e) {
                console.error("Failed to fetch Discord data:", e);
                setError(e instanceof Error ? e.message : 'Failed to fetch data');
                setIsConnected(false);
            }
        }

        fetchData();
        const interval = setInterval(fetchData, 10000);

        let ws: WebSocket | null = null;
        const connectWebSocket = () => {
            try {
                ws = new WebSocket('wss://api.lanyard.rest/socket');
                ws.onopen = () => {
                    console.log('WebSocket connected');
                    ws?.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }));
                    setInterval(() => ws?.send(JSON.stringify({ op: 3 })), 30000);
                };
                ws.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    if (message.t === 'INIT_STATE' || message.t === 'PRESENCE_UPDATE') {
                        if (message.d) {
                            setData(message.d);
                            setLastUpdated(new Date());
                            setIsConnected(true);
                            setError(null);
                        }
                    }
                };
                ws.onclose = () => {
                    console.log('WebSocket disconnected, reconnecting...');
                    setIsConnected(false);
                    setTimeout(connectWebSocket, 3000);
                };
                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    setIsConnected(false);
                    ws?.close();
                };
            } catch (e) {
                console.error('WebSocket connection failed:', e);
                setIsConnected(false);
            }
        };
        
        connectWebSocket();
        
        return () => {
            clearInterval(interval);
            if (ws) {
                ws.onclose = null;
                ws.close();
            }
        };
    }, []);

    // Autoplay a random song on initial load (muted)
    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * playlist.length);
        setCurrentIndex(randomIndex);
        if (audioRef.current) {
            audioRef.current.volume = volume;
            audioRef.current.muted = true; // Ensure it's muted
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(error => {
                console.error("Autoplay was blocked by the browser, which is expected.", error);
                setIsPlaying(false);
                setIsMuted(true); // Keep muted state consistent
            });
        }
    }, []); // Empty dependency to run only once

    // Parse Spotify data
    useEffect(() => {
        if (!data) return;
        const spotify = data.activities.find((a) => a.name === "Spotify");
        if (spotify) {
            const albumId = spotify.assets?.large_image?.replace("spotify:", "") || "";
            setSpotifyTrack({ song: spotify.details || "Unknown", artist: spotify.state || "", albumArt: `https://i.scdn.co/image/${albumId}`, url: `https://open.spotify.com/track/${spotify.sync_id}` });
        } else {
            setSpotifyTrack(null);
        }
    }, [data]);
    
    // Pause local player if Spotify is playing
    useEffect(() => {
        if (spotifyTrack && isPlaying && audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, [spotifyTrack, isPlaying]);

    // Update audio volume and mute when state changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
            audioRef.current.muted = isMuted;
        }
    }, [volume, isMuted]);

    // Handle track changes
    useEffect(() => {
        if (audioRef.current) {
            let isSrcSet = false;
            if (audioRef.current.src) {
                const currentSrc = new URL(audioRef.current.src).pathname;
                if (currentSrc !== currentTrack.src) {
                    audioRef.current.src = currentTrack.src; 
                    isSrcSet = true;
                }
            } else {
                audioRef.current.src = currentTrack.src; 
                isSrcSet = true;
            }
            if (isPlaying && !spotifyTrack) {
                if (isSrcSet) audioRef.current.load();
                audioRef.current.play().catch(e => console.error("Play failed:", e));
            }
        }
    }, [currentIndex, currentTrack, isPlaying, spotifyTrack]);
    
    // Sync audio element state with React state
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => nextTrack();
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [nextTrack]);

    // Loading State
    if (!mounted || !data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
                <motion.div className="relative text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
                    <div className="w-20 h-20 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="absolute top-2 left-2 w-16 h-16 border-2 border-pink-400/20 border-b-pink-300 rounded-full animate-spin animate-reverse"></div>
                    <motion.p className="text-white/70 text-sm mt-8 mb-2" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
                        {error ? 'Connection failed' : 'Connecting to Discord...'}
                    </motion.p>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xs mx-auto p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                            {error}
                        </motion.div>
                    )}
                </motion.div>
            </div>
        );
    }

    const activities = data.activities.filter((a: any) => a.type !== 4 && a.name !== 'Spotify');
    
    const VolumeIcon = () => {
        if (isMuted || volume === 0) return <VolumeX className="w-5 h-5 text-purple-300 flex-shrink-0"/>;
        if (volume < 0.5) return <Volume1 className="w-5 h-5 text-purple-300 flex-shrink-0"/>;
        return <Volume2 className="w-5 h-5 text-purple-300 flex-shrink-0"/>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0">
                <div className="absolute top-20 left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 w-full max-w-md mx-auto">
                <motion.div
                    className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]"
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                >
                    <motion.div className="absolute top-4 right-4 flex items-center space-x-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                        <div className="relative">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                            {isConnected && <motion.div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400/50" animate={{ scale: [1, 1.5], opacity: [1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} />}
                        </div>
                        <span className="text-xs text-white/50">{isConnected ? 'Live' : 'Offline'}</span>
                    </motion.div>
                    
                    <div className="text-center mb-6">
                        <motion.div className="relative inline-block mb-4" initial={{ scale: 0, rotate: 180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 1, delay: 0.3, type: "spring", stiffness: 200 }}>
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/20">
                                <img src={`https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.png?size=256`} alt="avatar" className="w-full h-full object-cover" />
                            </div>
                            <motion.div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-slate-950 ${data.discord_status === "online" ? "bg-green-400" : data.discord_status === "dnd" ? "bg-red-400" : data.discord_status === "idle" ? "bg-yellow-400" : "bg-gray-400"}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: "spring", stiffness: 300 }} />
                        </motion.div>
                        <motion.h1 className="text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
                            {data.discord_user.display_name}
                        </motion.h1>
                        <motion.p className="text-white/60 text-sm font-medium" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.8 }}>
                            @{data.discord_user.username}
                        </motion.p>
                    </div>

                    <div className="flex justify-center border-b border-white/10 mb-6">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${activeTab === tab.id ? "text-white" : "text-white/50 hover:text-white"} relative flex items-center space-x-2 rounded-t-md px-4 py-2 text-sm font-medium transition`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                                {activeTab === tab.id && (
                                    <motion.div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-purple-400" layoutId="underline" />
                                )}
                            </button>
                        ))}
                    </div>
                    
                    {isMuted && isPlaying && (
                        <motion.div 
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1, duration: 0.5 }}
                        >
                            <motion.button 
                                onClick={() => setIsMuted(false)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600/50 backdrop-blur-sm border border-purple-500/50 rounded-full shadow-lg hover:bg-purple-600/80 transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <VolumeX className="w-5 h-5"/>
                                Click to Unmute
                            </motion.button>
                        </motion.div>
                    )}

                    <div className="min-h-[250px] relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -10, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {activeTab === 'profile' && (
                                    <div>
                                        {spotifyTrack && (
                                            <motion.div layoutId="spotify-card" className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                                                <div className="flex items-center space-x-4">
                                                    <img src={spotifyTrack.albumArt} alt="Album Art" className="w-16 h-16 rounded-xl shadow-md"/>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-green-300 text-sm">🎧 Listening on Spotify</p>
                                                        <h3 className="text-white font-semibold truncate">{spotifyTrack.song}</h3>
                                                        <p className="text-green-200 text-xs truncate">{spotifyTrack.artist}</p>
                                                    </div>
                                                    <a href={spotifyTrack.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-200 border border-green-400/30 text-xs transition">Open</a>
                                                </div>
                                            </motion.div>
                                        )}
                                        <div className="space-y-3">
                                            {activities.length > 0 ? (
                                                activities.map(activity => (
                                                    <motion.div key={activity.id} className="group relative p-3 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] transition-colors">
                                                        <div className="flex items-center space-x-4">
                                                            {activity.assets?.large_image ? (
                                                                <img src={`https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`} alt="activity" className="w-12 h-12 rounded-lg object-cover" />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center"><span className="text-lg">🎮</span></div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-white font-semibold text-sm truncate">{activity.name}</h3>
                                                                {activity.details && <p className="text-white/70 text-xs truncate">{activity.details}</p>}
                                                                {activity.state && <p className="text-white/50 text-xs truncate">{activity.state}</p>}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8">
                                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.05] flex items-center justify-center border border-white/10"><span className="text-2xl">😴</span></div>
                                                    <p className="text-white/50 text-sm font-medium">No other activities</p>
                                                    <p className="text-white/30 text-xs mt-1">Currently idle or just chilling</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'music' && (
                                    <div className="text-center">
                                        <motion.img
                                            key={currentTrack.cover}
                                            src={currentTrack.cover}
                                            alt="cover"
                                            className="w-40 h-40 mx-auto rounded-2xl shadow-xl object-cover mb-4"
                                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                        />
                                        <h2 className="text-white text-lg font-bold">{currentTrack.title}</h2>
                                        <p className="text-purple-200 text-sm">{currentTrack.artist}</p>
                                        
                                        <div className="flex items-center gap-3 mt-4 px-4">
                                            <button onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
                                                <VolumeIcon />
                                            </button>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                value={isMuted ? 0 : volume}
                                                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-purple-500/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                            />
                                        </div>

                                        <div className="flex justify-center items-center space-x-6 my-4">
                                            <motion.button onClick={prevTrack} className="text-purple-300 hover:text-white transition" disabled={!!spotifyTrack} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} aria-label="Previous Track"><SkipBack className="w-7 h-7" /></motion.button>
                                            <motion.button onClick={togglePlay} disabled={!!spotifyTrack} className="bg-purple-500/20 p-4 rounded-full hover:bg-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} aria-label={isPlaying ? "Pause" : "Play"}>
                                                {isPlaying ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white" />}
                                            </motion.button>
                                            <motion.button onClick={nextTrack} className="text-purple-300 hover:text-white transition" disabled={!!spotifyTrack} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} aria-label="Next Track"><SkipForward className="w-7 h-7" /></motion.button>
                                        </div>

                                        <div className="mt-2 max-h-24 overflow-y-auto text-left space-y-1 pr-2 scrollbar-thin scrollbar-thumb-purple-600/50 scrollbar-track-transparent">
                                            {playlist.map((track, i) => (
                                                <motion.button 
                                                    key={`${track.title}-${i}`} 
                                                    onClick={() => selectTrack(i)} 
                                                    className={`block w-full text-left px-3 py-2 rounded-lg transition ${i === currentIndex ? "bg-purple-500/30 text-white" : "text-purple-200 hover:bg-purple-500/10"}`}
                                                    whileHover={{ x: 5 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    {track.title} – <span className="opacity-70">{track.artist}</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>

            <audio 
                ref={audioRef} 
                preload="metadata"
                onVolumeChange={(e) => {
                    setVolume(e.currentTarget.volume);
                    setIsMuted(e.currentTarget.muted);
                }}
            >
                <source src={currentTrack.src} type="audio/mpeg" />
            </audio>
        </div>
    );
}