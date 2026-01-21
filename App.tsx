
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import TheaterScene from './components/TheaterScene';
import { Camera, Image as ImageIcon, Scan, Maximize, Zap, X, BookOpen, Star, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Inventory Item Types
// PHONE is permanent in Right Hand.
// LEFT HAND items: EMPTY, BOOK, SIGNED_BOOK.
type ItemType = 'EMPTY' | 'BOOK' | 'SIGNED_BOOK' | null;

const App: React.FC = () => {
  // Game State
  const [hasStarted, setHasStarted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Hotbar State (Left Hand Items)
  // Slot 1: Empty (Idle Left Hand), Slot 2: Book (Left Hand holds Book)
  const [hotbar, setHotbar] = useState<ItemType[]>(['EMPTY', null, null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [hotbarOpacity, setHotbarOpacity] = useState(0);
  const lastActivityRef = useRef<number>(Date.now());
  const isTabHeldRef = useRef(false);

  // Tools & Modes
  const [cameraMode, setCameraMode] = useState(false);
  const [inventory, setInventory] = useState<string[]>([]); // Photo Gallery
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [flash, setFlash] = useState(false);

  // AR Video State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  
  // Use reliable video sources (Google Sample Videos)
  const posterVideos: Record<string, string> = {
    'Crimson Specter Poster': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'Emerald Voyage Poster': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'Azure Echo Poster': 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  };

  // Interaction State
  const [interactionText, setInteractionText] = useState<string | null>(null);
  const [targetedPoster, setTargetedPoster] = useState<string | null>(null);
  // Debounced target to prevent flickering
  const [activePoster, setActivePoster] = useState<string | null>(null);
  
  const [isHoveringUsher, setIsHoveringUsher] = useState(false);
  const [isHoveringPerformer, setIsHoveringPerformer] = useState(false);
  
  // Scene Logic State passed down
  const [doorOpen, setDoorOpen] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  const [sittingChair, setSittingChair] = useState<string | null>(null);
  const [nearDoor, setNearDoor] = useState(false);
  const [targetChair, setTargetChair] = useState<string | null>(null);

  // Stage Door Event State
  const [nearStageDoor, setNearStageDoor] = useState(false);
  const [performerArrived, setPerformerArrived] = useState(false);
  const [crowdExcitement, setCrowdExcitement] = useState(false);

  const controlsRef = useRef<any>(null);

  // --- EVENTS ---

  // Debounce Logic for Target Detection
  useEffect(() => {
    if (targetedPoster) {
      // If we find a target, set it immediately
      setActivePoster(targetedPoster);
    } else {
      // If we lose target, wait a bit before clearing to handle jitter
      const timer = setTimeout(() => {
        setActivePoster(null);
      }, 300); // 300ms buffer
      return () => clearTimeout(timer);
    }
  }, [targetedPoster]);

  // AR Video Playback Logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (cameraMode && activePoster && posterVideos[activePoster]) {
      const targetSrc = posterVideos[activePoster];
      
      // Check if we need to switch video source
      const currentPoster = video.getAttribute('data-poster');
      
      if (currentPoster !== activePoster) {
          setIsVideoLoading(true);
          setVideoOpacity(0); // Hide old video while loading new one
          
          video.src = targetSrc;
          video.setAttribute('data-poster', activePoster);
          video.load();
          
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                // Play started successfully
                // Wait for 'onPlaying' event to set opacity to 1
              })
              .catch(e => {
                console.warn("AR Video autoplay blocked/failed", e);
                setIsVideoLoading(false);
              });
          }
      } else {
          // Same video, ensure it's playing
          if (video.paused) {
            video.play().catch(e => console.error(e));
          }
          // If it was already playing, ensure visible
          if (!video.paused && !video.seeking) {
             setVideoOpacity(1);
          }
      }
    } else {
      // Lost tracking or exited camera mode
      setVideoOpacity(0);
      setIsVideoLoading(false);
      if (video && !video.paused) {
         video.pause();
         video.currentTime = 0; // Reset
      }
    }
  }, [cameraMode, activePoster]);
  
  // Trigger Performer Arrival
  useEffect(() => {
    if (nearStageDoor && !performerArrived) {
       const timer = setTimeout(() => {
          setPerformerArrived(true);
          setCrowdExcitement(true);
          // Hide excitement text after 5 seconds
          setTimeout(() => setCrowdExcitement(false), 5000);
       }, 3000);
       return () => clearTimeout(timer);
    }
  }, [nearStageDoor, performerArrived]);

  // --- HOTBAR VISIBILITY LOGIC ---
  const triggerHotbar = useCallback(() => {
    setHotbarOpacity(1);
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity > 2000 && !isTabHeldRef.current && !cameraMode) {
        setHotbarOpacity(0);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [cameraMode]);

  // --- ACTIONS ---

  const takePhoto = useCallback(async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const dataUrl = canvas.toDataURL('image/png');
    setInventory(prev => [dataUrl, ...prev]);
  }, []);

  const receiveBook = useCallback(() => {
    // Add book to slot 2 (index 1)
    setHotbar(prev => {
      const newHotbar = [...prev];
      newHotbar[1] = 'BOOK';
      return newHotbar;
    });
    // Auto equip
    setActiveSlot(1); 
    triggerHotbar();
  }, [triggerHotbar]);

  const receiveAutograph = useCallback(() => {
     // Check if we have the book anywhere
     const bookIndex = hotbar.indexOf('BOOK');
     
     if (bookIndex !== -1) {
       // Upgrade to Signed Book
       setHotbar(prev => {
         const newHotbar = [...prev];
         newHotbar[bookIndex] = 'SIGNED_BOOK';
         return newHotbar;
       });
       // Auto equip if not already equipped, or just show feedback
       setActiveSlot(bookIndex);
       triggerHotbar();
       setInteractionText("Performer: For my #1 fan! Keep it safe!");
     } else if (hotbar.includes('SIGNED_BOOK')) {
        setInteractionText("Performer: I already signed yours!");
     } else {
        setInteractionText("Performer: I can only sign official merchandise! Go see the Usher.");
     }
  }, [hotbar, triggerHotbar]);

  // --- INPUT HANDLING ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLocked && hasStarted) return; 

      // Hotbar Numbers
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const index = parseInt(e.key) - 1;
        setActiveSlot(index);
        triggerHotbar();
      }

      // Hotbar TAB
      if (e.code === 'Tab') {
        e.preventDefault();
        isTabHeldRef.current = true;
        triggerHotbar();
      }

      switch(e.code) {
        case 'KeyC':
          if (!galleryOpen) {
            // Camera is always available via Right Hand
            setCameraMode(prev => !prev);
          }
          break;
        case 'KeyE':
          if (nearDoor) {
            setDoorOpen(prev => !prev);
          } else if (isHoveringUsher && hotbar[1] === null) {
            receiveBook();
          }
          break;
        case 'KeyG':
          if (isHoveringPerformer && performerArrived) {
            receiveAutograph();
          }
          break;
        case 'KeyF':
          if (isSitting) {
            setIsSitting(false);
            setSittingChair(null);
          } else if (targetChair) {
            setIsSitting(true);
            setSittingChair(targetChair);
          }
          break;
        case 'Space':
        case 'Enter':
          if (cameraMode) takePhoto();
          break;
        case 'Escape':
           if (cameraMode) setCameraMode(false);
           if (galleryOpen) setGalleryOpen(false);
           break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        isTabHeldRef.current = false;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!isLocked || cameraMode) return;
      
      const direction = Math.sign(e.deltaY);
      setActiveSlot(prev => {
        let next = prev + direction;
        if (next > 4) next = 0;
        if (next < 0) next = 4;
        return next;
      });
      triggerHotbar();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isLocked, hasStarted, cameraMode, nearDoor, targetChair, isSitting, galleryOpen, takePhoto, activeSlot, hotbar, isHoveringUsher, isHoveringPerformer, performerArrived, receiveBook, receiveAutograph, triggerHotbar]);

  // Update Interaction Text
  useEffect(() => {
    // Priority system for text
    if (interactionText?.startsWith("Performer:")) {
       const timer = setTimeout(() => setInteractionText(null), 3000);
       return () => clearTimeout(timer);
    }

    if (isSitting) {
      setInteractionText("Press [F] to Stand");
    } else if (targetChair) {
      setInteractionText("Press [F] to Sit");
    } else if (nearDoor) {
      setInteractionText(`Press [E] to ${doorOpen ? 'Close' : 'Open'} Doors`);
    } else if (isHoveringUsher) {
       if (hotbar[1] === null) {
         setInteractionText("Press [E] to get Program");
       } else {
         setInteractionText("Usher: Enjoy the show.");
       }
    } else if (isHoveringPerformer && performerArrived) {
       setInteractionText("Press [G] to give Program Book");
    } else if (nearStageDoor && !performerArrived) {
       // Optional: Hint about waiting
    } else {
      setInteractionText(null);
    }
  }, [nearDoor, doorOpen, targetChair, isSitting, isHoveringUsher, isHoveringPerformer, performerArrived, nearStageDoor, hotbar]);

  return (
    <div className="relative w-full h-full bg-black select-none overflow-hidden font-sans">
      
      {/* 3D SCENE */}
      <Canvas shadows camera={{ fov: 75, position: [0, 1.7, 5] }} gl={{ preserveDrawingBuffer: true }}>
        <TheaterScene 
          onTargetChange={setTargetedPoster} 
          onChairTargetChange={setTargetChair}
          onAuditoriumDoorDistanceChange={setNearDoor}
          onUsherHover={setIsHoveringUsher}
          highlightedPoster={targetedPoster} 
          auditoriumDoorOpen={doorOpen}
          isSitting={isSitting}
          sittingChairId={sittingChair}
          isCameraActive={cameraMode}
          // New Props
          onStageDoorApproach={setNearStageDoor}
          onPerformerHover={setIsHoveringPerformer}
          performerArrived={performerArrived}
        />
        <PointerLockControls 
          ref={controlsRef} 
          onLock={() => setIsLocked(true)} 
          onUnlock={() => setIsLocked(false)} 
        />
      </Canvas>

      {/* FLASH & UI OVERLAYS */}
      <div className={`absolute inset-0 bg-white pointer-events-none z-[60] transition-opacity duration-150 ${flash ? 'opacity-100' : 'opacity-0'}`} />

      {/* START SCREEN */}
      {!hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center z-[70] bg-zinc-900">
          <div className="text-center p-10 max-w-md">
            <h1 className="text-6xl font-black mb-2 text-white tracking-tighter uppercase">THEATER</h1>
            <div className="w-full h-1 bg-white mb-6"></div>
            <p className="text-zinc-400 mb-8 text-xs uppercase tracking-widest leading-loose">
              Lobby: White Cube <br/> Auditorium: Black Box
            </p>
            <button 
              className="px-10 py-4 bg-white text-black font-bold hover:scale-105 transition-transform uppercase tracking-widest text-xs" 
              onClick={() => { setHasStarted(true); controlsRef.current?.lock(); }}
            >
              Enter
            </button>
          </div>
        </div>
      )}

      {/* DIALOGUE BUBBLE (Performer Waiting / Arrival) */}
      {nearStageDoor && !performerArrived && (
         <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
            <div className="text-white text-xs font-bold uppercase tracking-widest animate-pulse">
               Crowd: "She's coming out soon..."
            </div>
         </div>
      )}

      {crowdExcitement && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
            <div className="text-yellow-400 text-xl font-black uppercase tracking-tight animate-bounce drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
               CROWD: "OMIGOD SHE IS HERE!"
            </div>
          </div>
      )}

      {/* INTERACTION PROMPT */}
      {interactionText && !cameraMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-12 z-40 pointer-events-none">
          <div className="bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20 animate-in fade-in zoom-in duration-200">
            {interactionText}
          </div>
        </div>
      )}

      {/* CROSSHAIR (Roaming only) */}
      {!cameraMode && isLocked && !isSitting && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="w-1.5 h-1.5 bg-white mix-blend-difference rounded-full" />
        </div>
      )}

      {/* --- HOTBAR UI (Controls Left Hand) --- */}
      {hasStarted && (
        <div 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 bg-black/60 backdrop-blur rounded-lg border border-white/10 transition-opacity duration-300"
          style={{ opacity: hotbarOpacity }}
        >
          {hotbar.map((item, index) => (
            <div 
              key={index} 
              className={`
                w-12 h-12 bg-zinc-900/80 border-2 rounded flex items-center justify-center
                ${activeSlot === index ? 'border-yellow-500 scale-110' : 'border-white/30'}
                transition-all duration-100 relative
              `}
            >
              {item === 'EMPTY' && index === 0 && <span className="text-[10px] text-zinc-600">IDLE</span>}
              {item === 'BOOK' && <BookOpen size={20} className="text-white" />}
              {item === 'SIGNED_BOOK' && (
                 <>
                   <BookOpen size={20} className="text-yellow-400" />
                   <Star size={10} className="absolute top-1 right-1 text-yellow-400 fill-current" />
                 </>
              )}
              {/* Slot Number Overlay */}
              <div className="absolute top-0.5 left-1 text-[8px] text-zinc-500 font-mono">{index + 1}</div>
            </div>
          ))}
        </div>
      )}

      {/* --- HANDS LAYER --- */}
      {hasStarted && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
          
          {/* 1. LEFT HAND (Always Visible) */}
          {/* Default: Idle Hand. If Item: Holding Hand. */}
          <div className={`
             absolute bottom-[-30px] left-[-30px] w-[200px] h-[320px] 
             transition-transform duration-500 ease-out origin-bottom-left rotate-[10deg]
          `}>
             {(hotbar[activeSlot] === 'BOOK' || hotbar[activeSlot] === 'SIGNED_BOOK') ? (
                // Holding Book
                <div className="w-full h-full relative">
                   <img 
                     src="https://placehold.co/200x320/3a2015/e0c090?text=Hand+w/+Book" 
                     className="w-full h-full object-cover rounded-t-[40px] border-t-2 border-r-2 border-[#5a3025] shadow-xl"
                     alt="Holding Book"
                   />
                   {hotbar[activeSlot] === 'SIGNED_BOOK' && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-20deg] border-2 border-yellow-500 text-yellow-500 text-[10px] font-bold px-2 py-1 bg-black/50 rounded">
                        SIGNED
                      </div>
                   )}
                </div>
             ) : (
                // Idle / Empty (Default for Slot 1 and others)
                <div className="w-full h-full relative">
                   <img 
                     src="https://placehold.co/200x320/1a1a1a/444444?text=Left+Hand" 
                     className="w-full h-full object-cover rounded-t-[40px] border-t-2 border-r-2 border-zinc-800 shadow-xl opacity-90"
                     alt="Idle Hand"
                   />
                </div>
             )}
          </div>

          {/* 2. RIGHT HAND (Always Phone) */}
          <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center justify-center
            ${cameraMode 
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[800px] h-[60%] z-50' 
              : 'bottom-[-40px] right-[-40px] w-[220px] h-[380px] rotate-[-10deg]'
            }
          `}>
            
            {/* PHONE UI */}
            <div className={`
              relative bg-black border-4 border-zinc-800 shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden
              ${cameraMode 
                ? 'w-full h-full rotate-0 rounded-[20px] bg-transparent border-[12px] border-zinc-900/90' 
                : 'w-[200px] h-[380px] rounded-[30px]'
              }
            `}>
              {/* SCREEN CONTENT */}
              <div className="w-full h-full relative flex flex-col pointer-events-auto">
                
                {/* --- CAMERA VIEW --- */}
                {cameraMode ? (
                  <>
                    {/* AR Video Layer */}
                    <div className="absolute inset-0 bg-transparent z-0">
                        {isVideoLoading && activePoster && (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
                              <Loader2 className="animate-spin text-white w-8 h-8" />
                           </div>
                        )}
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover transition-opacity duration-500"
                            style={{ opacity: videoOpacity }}
                            loop
                            muted
                            playsInline
                            crossOrigin="anonymous"
                            onPlaying={() => {
                                setIsVideoLoading(false);
                                setVideoOpacity(1);
                            }}
                            onWaiting={() => setIsVideoLoading(true)}
                        />
                    </div>

                    {/* Viewfinder Overlay */}
                    <div className="absolute inset-0 pointer-events-none z-10">
                      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/50" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/50" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/50" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/50" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/50" />
                        <div className="absolute left-1/2 top-0 h-full w-[1px] bg-white/50" />
                      </div>
                      {/* AR OVERLAY */}
                      {activePoster && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-pulse">
                            <Scan size={120} className="text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" strokeWidth={1} />
                            <div className="mt-2 bg-black/60 backdrop-blur px-3 py-1 text-[10px] text-white uppercase tracking-widest rounded border border-white/20">
                              {activePoster}
                            </div>
                        </div>
                      )}
                    </div>
                    {/* Camera Controls */}
                    <div className="mt-auto p-6 flex items-center justify-between w-full bg-gradient-to-t from-black/80 to-transparent relative z-20">
                      <div className="flex flex-col text-white/70 text-[10px] uppercase tracking-widest font-mono">
                          <span>ISO 400</span>
                          <span>1/60s</span>
                      </div>
                      <button 
                        onClick={takePhoto}
                        className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                      >
                          <div className="w-12 h-12 bg-white rounded-full" />
                      </button>
                      <button onClick={() => setGalleryOpen(true)} className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center border border-white/20 hover:bg-zinc-700">
                          {inventory.length > 0 ? (
                            <img src={inventory[0]} className="w-full h-full object-cover rounded-lg opacity-80" />
                          ) : (
                            <ImageIcon size={20} className="text-white/50" />
                          )}
                      </button>
                    </div>
                  </>
                ) : (
                  /* --- HOME SCREEN (Vertical) --- */
                  <div className="w-full h-full bg-zinc-950 flex flex-col p-6">
                    <div className="flex justify-between items-center text-zinc-500 text-[10px] font-bold mb-10">
                      <span>12:45</span>
                      <Zap size={12} className="fill-current" />
                    </div>
                    <div className="text-white text-5xl font-thin tracking-tighter mb-1">12:45</div>
                    <div className="text-zinc-500 text-xs uppercase tracking-widest mb-12">Sunday, Oct 24</div>
                    <div className="grid grid-cols-4 gap-4">
                      <button onClick={() => setCameraMode(true)} className="aspect-square bg-zinc-800 rounded-2xl flex items-center justify-center text-white hover:bg-zinc-700 transition-colors group">
                        <Camera size={24} className="group-hover:scale-110 transition-transform" />
                      </button>
                      <button onClick={() => setGalleryOpen(true)} className="aspect-square bg-zinc-800 rounded-2xl flex items-center justify-center text-white hover:bg-zinc-700 transition-colors group">
                        <ImageIcon size={24} className="group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                    <div className="mt-auto w-full flex justify-center pb-2">
                      <div className="w-20 h-1 bg-zinc-800 rounded-full" />
                    </div>
                  </div>
                )}

                {/* --- GALLERY OVERLAY (In Phone) --- */}
                {galleryOpen && (
                  <div className="absolute inset-0 bg-black z-20 flex flex-col animate-in slide-in-from-bottom duration-300">
                    <div className="p-4 flex justify-between items-center border-b border-white/10">
                        <span className="text-white text-xs uppercase tracking-widest font-bold">Gallery</span>
                        <button onClick={() => setGalleryOpen(false)} className="text-white hover:text-red-400"><X size={20}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 content-start">
                        {inventory.map((img, i) => (
                          <div key={i} className="aspect-video bg-zinc-900 rounded overflow-hidden border border-white/10">
                              <img src={img} className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {inventory.length === 0 && <div className="col-span-2 text-center text-zinc-600 text-xs mt-10">Empty</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Arm Mesh (Right Hand) */}
            {!cameraMode && (
               <div className="absolute top-[80%] right-[-20%] w-[220px] h-[400px] bg-zinc-900 rotate-12 -z-10 rounded-3xl" />
            )}
          </div>

        </div>
      )}

      {/* Control Hint */}
      <div className="absolute top-6 right-6 text-[10px] text-zinc-500 font-mono text-right pointer-events-none">
        <div>[WASD] MOVE</div>
        <div>[1-5] LEFT HAND</div>
        <div>[C] CAMERA (RIGHT HAND)</div>
        <div>[E] INTERACT</div>
        <div>[G] GIVE ITEM</div>
      </div>
    </div>
  );
};

export default App;
