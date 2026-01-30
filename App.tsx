
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import TheaterScene from './components/TheaterScene';
import { Camera, Image as ImageIcon, Scan, Maximize, Zap, X, BookOpen, Star, Loader2, Binoculars, MousePointer2, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';

// Inventory Item Types
type ItemType = 'EMPTY' | 'OPERA_GLASS' | 'BOOK' | 'SIGNED_BOOK' | null;

const PROGRAM_PAGES = [
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/1.png",
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/2.png",
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/3.png",
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/aa423786de2867da409b338855f8f990476fe518/4.png", 
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/5.png"
];

const PAGE_BORDER_COLOR = "#000000";

const App: React.FC = () => {
  // Refs
  const controlsRef = useRef<any>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isTabHeldRef = useRef(false);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hintTimeoutRef = useRef<number | null>(null);
  const lastInteractionKeyRef = useRef<string | null>(null);
  const playerPositionRef = useRef({ x: 0, y: 0, z: 0 });

  // Game State
  const [hasStarted, setHasStarted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasVisitedAuditorium, setHasVisitedAuditorium] = useState(false);

  // Time State
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mobile Movement State
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isMovingJoystick, setIsMovingJoystick] = useState(false);
  
  // Hotbar State
  const [hotbar, setHotbar] = useState<ItemType[]>(['EMPTY', 'OPERA_GLASS', null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [hotbarOpacity, setHotbarOpacity] = useState(0);

  // Tools & Modes
  const [cameraMode, setCameraMode] = useState(false);
  const [inventory, setInventory] = useState<string[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [isZooming, setIsZooming] = useState(false);

  // Performer Randomization
  const [stagePerformerIndex, setStagePerformerIndex] = useState(0);

  // AR Video State
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  
  const posterVideos: Record<string, string> = {
    'Crimson Specter Poster': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'Emerald Voyage Poster': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'Azure Echo Poster': 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  };

  // Interaction State
  const [interactionText, setInteractionText] = useState<string | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<string | null>(null);
  const [targetedPoster, setTargetedPoster] = useState<string | null>(null);
  const [activePoster, setActivePoster] = useState<string | null>(null);
  
  const [isHoveringUsher, setIsHoveringUsher] = useState(false);
  const [isHoveringPerformer, setIsHoveringPerformer] = useState(false);
  
  const [auditoriumDoorOpen, setAuditoriumDoorOpen] = useState(false);
  const [lobbyDoorOpen, setLobbyDoorOpen] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  const [sittingChair, setSittingChair] = useState<string | null>(null);
  const [nearAuditoriumDoor, setNearAuditoriumDoor] = useState(false);
  const [nearLobbyDoor, setNearLobbyDoor] = useState(false);
  const [targetChair, setTargetChair] = useState<string | null>(null);

  const [nearStageDoor, setNearStageDoor] = useState(false);
  const [performerArrived, setPerformerArrived] = useState(false);
  const [crowdExcitement, setCrowdExcitement] = useState(false);

  const activeItem = hotbar[activeSlot];
  const isHoldingOperaGlass = activeItem === 'OPERA_GLASS';
  const isHoldingBook = activeItem === 'BOOK' || activeItem === 'SIGNED_BOOK';
  const currentTargetFov = (isHoldingOperaGlass && isZooming) ? 30 : 75;

  const isPhoneActive = cameraMode || galleryOpen;

  // Real-time Clock Effect - Updated to 1s for smoother "Real-time" feel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); 
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const formattedDate = currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  // Dynamic timezone name (e.g., "Los Angeles" or "London")
  const formattedLocation = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ') || 'Local';

  useEffect(() => {
    const handleActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, []);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    if (cameraMode) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (webcamRef.current) {
            webcamRef.current.srcObject = stream;
          }
        })
        .catch(console.error);
    } else {
      if (webcamRef.current && webcamRef.current.srcObject) {
        (webcamRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    }
  }, [cameraMode]);

  useEffect(() => {
    if (targetedPoster) {
      setActivePoster(targetedPoster);
    } else {
      const timer = setTimeout(() => setActivePoster(null), 300);
      return () => clearTimeout(timer);
    }
  }, [targetedPoster]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (cameraMode && activePoster && posterVideos[activePoster]) {
      const targetSrc = posterVideos[activePoster];
      if (video.src !== targetSrc) {
        setIsVideoLoading(true);
        setVideoOpacity(0);
        video.src = targetSrc;
        video.load();
        video.play().catch(() => setIsVideoLoading(false));
      } else {
        if (video.paused) video.play();
        setVideoOpacity(1);
      }
    } else {
      setVideoOpacity(0);
      setIsVideoLoading(false);
      if (video && !video.paused) {
        video.pause();
      }
    }
  }, [cameraMode, activePoster]);
  
  useEffect(() => {
    if (nearStageDoor && !performerArrived && hasVisitedAuditorium) {
       const arrivalTimer = setTimeout(() => {
          setPerformerArrived(true);
          setCrowdExcitement(true);
          setTimeout(() => setCrowdExcitement(false), 5000);
       }, 2000);
       return () => clearTimeout(arrivalTimer);
    }
  }, [nearStageDoor, performerArrived, hasVisitedAuditorium]);

  useEffect(() => {
    setLobbyDoorOpen(nearLobbyDoor);
  }, [nearLobbyDoor]);

  const handleAuditoriumEntry = useCallback(() => {
    setHasVisitedAuditorium(true);
    setStagePerformerIndex(Math.floor(Math.random() * 3));
  }, []);

  const handleAuditoriumExit = useCallback(() => {
    setAuditoriumDoorOpen(false);
  }, []);

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

  const takePhoto = useCallback(async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    const dataUrl = canvas.toDataURL('image/png');
    setInventory(prev => [dataUrl, ...prev]);
  }, []);

  const showDialogue = useCallback((text: string, duration: number = 3500) => {
    setActiveDialogue(text);
    setTimeout(() => setActiveDialogue(null), duration);
  }, []);

  const receiveBook = useCallback(() => {
    setHotbar(prev => {
      const newHotbar = [...prev];
      newHotbar[2] = 'BOOK';
      return newHotbar;
    });
    setActiveSlot(2); 
    triggerHotbar();
    setAuditoriumDoorOpen(true);
    showDialogue("Usher: Here's your program. I've opened the theater doors for you. Enjoy!");
  }, [triggerHotbar, showDialogue]);

  const receiveAutograph = useCallback(() => {
     const bookIndex = hotbar.indexOf('BOOK');
     const signedBookIndex = hotbar.indexOf('SIGNED_BOOK');
     
     if (bookIndex !== -1) {
       setHotbar(prev => {
         const newHotbar = [...prev];
         newHotbar[bookIndex] = 'SIGNED_BOOK';
         return newHotbar;
       });
       setActiveSlot(bookIndex);
       triggerHotbar();
       showDialogue("Performer: For my #1 fan! Enjoy the show.");
     } else if (signedBookIndex !== -1) {
       showDialogue("Performer: I've already signed your program, dear.");
     } else {
       showDialogue("Performer: You should get the program book from the usher and catch the show first!");
     }
  }, [hotbar, triggerHotbar, showDialogue]);

  const nextPage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentPage(prev => (prev + 1) % PROGRAM_PAGES.length);
  }, []);

  const prevPage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentPage(prev => (prev - 1 + PROGRAM_PAGES.length) % PROGRAM_PAGES.length);
  }, []);

  const handleJoystickMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2;
    const power = Math.min(dist / maxDist, 1);
    const angle = Math.atan2(dy, dx);
    setJoystickPos({ x: Math.cos(angle) * power, y: Math.sin(angle) * power });
  };

  const handlePhoneClose = useCallback(() => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex(null);
    } else {
      setGalleryOpen(false);
      setCameraMode(false);
      if (!isTouchDevice && controlsRef.current) {
          controlsRef.current.lock();
      }
    }
  }, [selectedPhotoIndex, isTouchDevice]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => { 
      if (e.button === 2) setIsZooming(true); 
      if (e.button === 0 && isHoldingBook && isLocked && !isPhoneActive) {
        setIsReading(prev => !prev);
        if (!isReading) setCurrentPage(0);
      }
    };
    const handleMouseUp = (e: MouseEvent) => { if (e.button === 2) setIsZooming(false); };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLocked && hasStarted) return; 
      if (isReading) {
        if (e.code === 'Escape') { setIsReading(false); return; }
        if (e.code === 'ArrowRight' || e.code === 'Space') { nextPage(); return; }
        if (e.code === 'ArrowLeft') { prevPage(); return; }
      }

      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        setActiveSlot(parseInt(e.key) - 1);
        triggerHotbar();
      }
      if (e.code === 'Tab') { e.preventDefault(); isTabHeldRef.current = true; triggerHotbar(); }
      switch(e.code) {
        case 'KeyZ': setIsZooming(true); break;
        case 'KeyC': 
            if (!galleryOpen && !isReading) {
                setCameraMode(prev => {
                    const next = !prev;
                    if (next && !isTouchDevice) controlsRef.current?.unlock();
                    return next;
                });
            }
            break;
        case 'KeyE':
        case 'KeyR':
          if (isHoveringUsher) {
            if (hotbar[2] === null) receiveBook();
            else {
               setAuditoriumDoorOpen(true);
               showDialogue("Usher: Of course, let me open those for you again.");
            }
          } else if (nearAuditoriumDoor && !auditoriumDoorOpen) {
            showDialogue("Usher: Talk to me! You'll need a program to enter.");
          }
          break;
        case 'KeyG': if (isHoveringPerformer && performerArrived) receiveAutograph(); break;
        case 'KeyF':
          if (isSitting) { setIsSitting(false); setSittingChair(null); }
          else if (targetChair && playerPositionRef.current.z <= 0.5) { setIsSitting(true); setSittingChair(targetChair); }
          break;
        case 'Space': case 'Enter': if (cameraMode) takePhoto(); break;
        case 'Escape': 
          if (isReading) setIsReading(false);
          else if (isPhoneActive) handlePhoneClose();
          break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') isTabHeldRef.current = false;
      if (e.code === 'KeyZ') setIsZooming(false);
    };
    const handleWheel = (e: WheelEvent) => {
      if (!isLocked || cameraMode || isReading || galleryOpen) return;
      const direction = Math.sign(e.deltaY);
      setActiveSlot(prev => (prev + direction + 5) % 5);
      triggerHotbar();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isLocked, hasStarted, cameraMode, galleryOpen, isPhoneActive, handlePhoneClose, nearAuditoriumDoor, nearLobbyDoor, targetChair, isSitting, takePhoto, activeSlot, hotbar, isHoveringUsher, isHoveringPerformer, performerArrived, receiveBook, receiveAutograph, triggerHotbar, isReading, isHoldingBook, nextPage, prevPage, showDialogue, auditoriumDoorOpen, isTouchDevice]);

  useEffect(() => {
    let text: string | null = null;
    let key: string | null = null;
    const isInside = playerPositionRef.current.z <= 0.5;

    if (activeDialogue) { text = activeDialogue; key = 'dialogue'; }
    else if (isReading) { text = "Press [ESC] to Stop Reading or Arrows to Turn Pages"; key = 'reading'; }
    else if (isPhoneActive) { text = "Press [ESC] to close phone"; key = 'phone-active'; }
    else if (isSitting) { text = "Press [F] to Stand"; key = 'sit-stand'; }
    else if (targetChair && isInside) { text = "Press [F] to Sit"; key = `sit-chair-${targetChair}`; }
    else if (isHoveringUsher) {
       if (hotbar[2] === null) { text = "Press [R] to talk to Usher"; key = 'usher-book'; }
       else { text = "Press [R] to ask Usher to open doors"; key = 'usher-reopen'; }
    } else if (nearAuditoriumDoor && !auditoriumDoorOpen && !isInside) {
       text = "Talk to the Usher to enter"; key = 'usher-needed';
    } else if (isHoveringPerformer && performerArrived) {
       text = "Press [G] to speak with Performer"; key = 'performer';
    } else if (nearStageDoor && !performerArrived) { 
       text = hasVisitedAuditorium ? "Fans: Is she coming out?" : "Stage Door is locked from this side."; key = 'fans'; 
    }
    else if (isHoldingBook) { text = "Left Click to Read Program"; key = 'book-hint'; }
    else if (isHoldingOperaGlass && !isZooming) { text = "Hold [Z] or Right Click to Zoom"; key = 'zoom-hint'; }

    if (key !== lastInteractionKeyRef.current) {
        lastInteractionKeyRef.current = key;
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        if (text) {
          setInteractionText(text);
          hintTimeoutRef.current = window.setTimeout(() => setInteractionText(null), 4000);
        } else {
          setInteractionText(null);
        }
    }
  }, [nearAuditoriumDoor, nearLobbyDoor, auditoriumDoorOpen, lobbyDoorOpen, targetChair, isSitting, isHoveringUsher, isHoveringPerformer, performerArrived, nearStageDoor, hotbar, isReading, isHoldingBook, activeDialogue, cameraMode, isZooming, isHoldingOperaGlass, hasStarted, isLocked, hasVisitedAuditorium, isPhoneActive]);

  const deletePhoto = (index: number) => {
    setInventory(prev => prev.filter((_, i) => i !== index));
    if (selectedPhotoIndex === index) setSelectedPhotoIndex(null);
  };

  return (
    <div className="relative w-full h-full bg-black select-none overflow-hidden font-sans">
      <video ref={webcamRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover z-0 opacity-100 pointer-events-none" />

      <div className={`transition-opacity duration-700 w-full h-full z-10 relative`}>
        <Canvas shadows camera={{ fov: 75, position: [0, 2.5, 5] }} gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}>
          <TheaterScene 
            onTargetChange={setTargetedPoster} 
            onChairTargetChange={setTargetChair}
            onAuditoriumDoorDistanceChange={setNearAuditoriumDoor}
            onLobbyDoorDistanceChange={setNearLobbyDoor}
            onUsherHover={setIsHoveringUsher}
            onStageDoorApproach={setNearStageDoor}
            onPerformerHover={setIsHoveringPerformer}
            onAuditoriumEntry={handleAuditoriumEntry}
            onAuditoriumExit={handleAuditoriumExit}
            onPositionUpdate={(pos) => { playerPositionRef.current = pos; }}
            highlightedPoster={targetedPoster} 
            auditoriumDoorOpen={auditoriumDoorOpen}
            lobbyDoorOpen={lobbyDoorOpen}
            isSitting={isSitting}
            sittingChairId={sittingChair}
            isCameraActive={cameraMode}
            performerArrived={performerArrived}
            stagePerformerIndex={stagePerformerIndex}
            fov={currentTargetFov}
            isVisible={true}
            joystickInput={joystickPos}
            isTouchDevice={isTouchDevice}
            isHoveringUsher={isHoveringUsher}
          />
          {!isTouchDevice && <PointerLockControls ref={controlsRef} onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />}
        </Canvas>
      </div>

      <div className={`absolute inset-0 bg-white pointer-events-none z-[100] transition-opacity duration-150 ${flash ? 'opacity-100' : 'opacity-0'}`} />

      {isLocked && !isReading && !isPhoneActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] pointer-events-none flex items-center justify-center">
           <div className={`w-1 h-1 bg-white rounded-full transition-all duration-300 ${interactionText ? 'scale-[6] opacity-0' : 'opacity-100'}`} />
           <div className={`absolute w-6 h-6 border-2 border-white/50 rounded-full transition-all duration-300 ${interactionText ? 'scale-110 opacity-100' : 'scale-50 opacity-0'}`} />
        </div>
      )}

      <div className={`absolute inset-0 pointer-events-none z-40 bg-black/80 transition-opacity duration-500 ${isZooming && isHoldingOperaGlass ? 'opacity-100' : 'opacity-0'}`}
           style={{ maskImage: 'radial-gradient(circle at center, transparent 35%, black 65%)', WebkitMaskImage: 'radial-gradient(circle at center, transparent 35%, black 65%)' }} />

      {isReading && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsReading(false)} />
           <div className="relative w-full h-full sm:max-w-4xl sm:max-h-[85vh] flex flex-col items-center justify-center p-4">
              <div 
                className="relative group w-full aspect-[4/3] max-h-[80vh] shadow-[0_0_80px_rgba(0,0,0,1)] rounded-sm overflow-hidden flex items-center justify-center border-4 border-black" 
                style={{ backgroundColor: PAGE_BORDER_COLOR }}
                onClick={(e) => e.stopPropagation()}
              >
                 <img 
                    src={PROGRAM_PAGES[currentPage]} 
                    className="h-full w-auto object-contain select-none shadow-2xl"
                    alt={`Program Page ${currentPage + 1}`}
                    loading="eager"
                 />
                 
                 <div className="absolute inset-0 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <button onClick={prevPage} className="p-4 bg-black/40 text-white rounded-r-full hover:bg-black/60 transition-colors pointer-events-auto ml-2"><ChevronLeft size={48} /></button>
                    <button onClick={nextPage} className="p-4 bg-black/40 text-white rounded-l-full hover:bg-black/60 transition-colors pointer-events-auto mr-2"><ChevronRight size={48} /></button>
                 </div>

                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-black/60 rounded-full text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">
                    Page {currentPage + 1} / {PROGRAM_PAGES.length}
                 </div>
              </div>
              <button onClick={() => setIsReading(false)} className="mt-6 px-10 py-3 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-full hover:scale-105 transition-transform">Close Program</button>
           </div>
        </div>
      )}

      {!hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center z-[150] bg-zinc-950">
          <div className="text-center p-6 sm:p-12 max-w-lg">
            <h1 className="text-5xl sm:text-7xl font-black mb-4 text-white tracking-tighter uppercase">THEATER</h1>
            <div className="w-24 h-1 bg-white mx-auto mb-8"></div>
            <p className="text-zinc-500 mb-10 text-[10px] uppercase tracking-[0.3em] leading-loose">White Lobby | Black Auditorium</p>
            <div className="flex flex-col gap-4">
              <button className="px-12 py-5 bg-white text-black font-black hover:scale-105 transition-transform uppercase tracking-[0.2em] text-[10px] shadow-2xl" 
                      onClick={() => { setHasStarted(true); if (!isTouchDevice) controlsRef.current?.lock(); else setIsLocked(true); }}>Enter Theater</button>
              <button className="px-12 py-3 bg-zinc-800 text-white font-black hover:bg-zinc-700 transition-colors uppercase tracking-[0.2em] text-[10px]" 
                      onClick={toggleFullscreen}><Maximize size={14} className="inline mr-2" /> Full Screen</button>
            </div>
          </div>
        </div>
      )}

      {isTouchDevice && hasStarted && isLocked && (
        <div className="absolute inset-0 z-[60] pointer-events-none">
          <div className="absolute bottom-12 left-12 w-32 h-32 bg-white/5 border border-white/10 rounded-full pointer-events-auto flex items-center justify-center touch-none"
               onTouchStart={() => setIsMovingJoystick(true)}
               onTouchMove={handleJoystickMove}
               onTouchEnd={() => { setIsMovingJoystick(false); setJoystickPos({ x: 0, y: 0 }); }}>
            <div className="w-12 h-12 bg-white/20 border border-white/40 rounded-full shadow-2xl transition-transform duration-75"
                 style={{ transform: `translate(${joystickPos.x * 40}px, ${joystickPos.y * 40}px)` }} />
          </div>
        </div>
      )}

      {interactionText && !isPhoneActive && (
        <div className="absolute top-[65%] left-1/2 -translate-x-1/2 z-[90] pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md text-black px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl animate-in fade-in zoom-in duration-500">{interactionText}</div>
        </div>
      )}

      {hasStarted && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
          <div className={`absolute bottom-[-20px] left-[-30px] w-[180px] sm:w-[240px] h-[300px] sm:h-[360px] transition-all duration-700 ease-out origin-bottom-left rotate-[8deg] ${isZooming && isHoldingOperaGlass ? 'translate-y-40 scale-75 opacity-0' : ''} ${isReading || isPhoneActive ? 'translate-y-60 opacity-0' : ''}`}>
             {activeItem === 'OPERA_GLASS' ? (
                <div className="w-full h-full relative">
                   <div className="absolute inset-0 bg-zinc-800 rounded-t-[50px] border-t-4 border-r-4 border-zinc-700 shadow-2xl flex flex-col items-center justify-start pt-12">
                      <div className="relative flex flex-col items-center">
                        <div className="w-20 sm:w-28 h-4 bg-zinc-900 rounded shadow-md border-b-2 border-zinc-700 mb-[-2px] z-10" />
                        <div className="flex gap-2">
                           <div className="w-10 sm:w-14 h-24 sm:h-32 bg-gradient-to-tr from-black via-zinc-900 to-zinc-800 rounded-[10px_10px_20px_20px] border-2 border-zinc-600 shadow-xl relative overflow-hidden" />
                           <div className="w-10 sm:w-14 h-24 sm:h-32 bg-gradient-to-tr from-black via-zinc-900 to-zinc-800 rounded-[10px_10px_20px_20px] border-2 border-zinc-600 shadow-xl relative overflow-hidden" />
                        </div>
                      </div>
                   </div>
                </div>
             ) : (activeItem === 'BOOK' || activeItem === 'SIGNED_BOOK') ? (
                <div className="w-full h-full bg-zinc-900 rounded-t-[50px] border-t-4 border-r-4 border-zinc-800 shadow-2xl overflow-hidden relative">
                   <img src={PROGRAM_PAGES[0]} className="w-full h-full object-cover opacity-90" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
             ) : (
                <div className="w-full h-full bg-zinc-900 rounded-t-[50px] border-t-4 border-r-4 border-zinc-800 shadow-2xl opacity-40" />
             )}
          </div>

          <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center ${isPhoneActive ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[850px] h-[65%] z-50' : 'bottom-[-40px] right-[-40px] w-[180px] sm:w-[240px] h-[300px] sm:h-[380px] rotate-[-10deg]'} ${isReading ? 'opacity-0 scale-50' : ''}`}>
            <div className={`relative border-4 border-zinc-900 shadow-2xl transition-all duration-700 overflow-hidden ${isPhoneActive ? 'w-full h-full rotate-0 rounded-[30px] border-[12px] border-zinc-900/90' : 'w-full h-full rounded-[40px] bg-zinc-950'} ${cameraMode ? 'bg-transparent' : 'bg-zinc-950'}`}>
              <div className="w-full h-full relative flex flex-col pointer-events-auto bg-transparent">
                {cameraMode ? (
                  <>
                    <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center bg-transparent">
                        <div className="absolute inset-0 border-[1px] border-white/10 grid grid-cols-3 grid-rows-3">
                           <div className="border-[0.5px] border-white/5" /><div className="border-[0.5px] border-white/5" /><div className="border-[0.5px] border-white/5" />
                           <div className="border-[0.5px] border-white/5" /><div className="border-[0.5px] border-white/5" /><div className="border-[0.5px] border-white/5" />
                           <div className="border-[0.5px] border-white/5" /><div className="border-[0.5px] border-white/5" /><div className="border-[0.5px] border-white/5" />
                        </div>
                        <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/40" />
                        <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/40" />
                        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/40" />
                        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/40" />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="w-48 h-48 border border-white/20 rounded-full animate-pulse" />
                           {activePoster && <div className="absolute flex flex-col items-center"><Scan size={120} className="text-white drop-shadow-glow" /><span className="mt-4 bg-white text-black px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">{activePoster}</span></div>}
                        </div>
                        <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
                           {isVideoLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="animate-spin text-white" /></div>}
                           <video ref={videoRef} className="w-full h-full object-cover transition-opacity duration-500" style={{ opacity: videoOpacity }} loop muted playsInline onPlaying={() => { setIsVideoLoading(false); setVideoOpacity(1); }} />
                        </div>
                    </div>
                    <div className="mt-auto p-10 flex items-center justify-between w-full bg-gradient-to-t from-black/40 to-transparent relative z-20">
                      <div className="flex flex-col text-white/50 text-[10px] font-mono"><span>4K</span><span>RAW</span></div>
                      <button onClick={takePhoto} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"><div className="w-12 h-12 bg-white rounded-full shadow-lg" /></button>
                      <button onClick={() => { setGalleryOpen(true); setCameraMode(false); }} className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
                        {inventory.length > 0 ? <img src={inventory[0]} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-white/20" />}
                      </button>
                    </div>
                  </>
                ) : galleryOpen ? (
                  <div className="absolute inset-0 bg-zinc-950 z-[60] flex flex-col animate-in slide-in-from-bottom duration-500">
                    <div className="p-8 flex justify-between items-center border-b border-white/5">
                      <div className="flex items-center gap-4">
                        {selectedPhotoIndex !== null && <button onClick={() => setSelectedPhotoIndex(null)} className="text-white hover:text-white/70"><ChevronLeft size={24} /></button>}
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">{selectedPhotoIndex !== null ? 'Photo View' : 'Gallery'}</span>
                      </div>
                      <button onClick={handlePhoneClose} className="text-white/30 hover:text-white p-2 bg-white/5 rounded-full flex items-center gap-2 px-3"><span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Close</span><X size={24}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                      {selectedPhotoIndex !== null ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
                          <div className="relative w-full max-w-xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10"><img src={inventory[selectedPhotoIndex]} className="w-full h-full object-contain bg-black" /></div>
                          <div className="flex gap-4">
                            <button onClick={() => deletePhoto(selectedPhotoIndex)} className="px-8 py-3 bg-red-600/20 text-red-500 rounded-full border border-red-600/30 flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest"><Trash2 size={16} /> Delete</button>
                            <button onClick={() => setSelectedPhotoIndex(null)} className="px-8 py-3 bg-white text-black rounded-full font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform">Back</button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 content-start animate-in fade-in duration-300">
                          {inventory.length > 0 ? inventory.map((img, i) => (
                              <div key={i} onClick={() => setSelectedPhotoIndex(i)} className="aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-white/5 shadow-lg group relative cursor-pointer hover:border-white/20 transition-all active:scale-95">
                                <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              </div>
                            )) : (
                            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                              <ImageIcon size={48} className="text-white/10" />
                              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Your gallery is empty</span>
                              <button onClick={() => { setCameraMode(true); setGalleryOpen(false); }} className="mt-4 px-6 py-2 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest">Take a Photo</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col p-6 sm:p-10 bg-zinc-950">
                    <div className="flex justify-between items-center text-zinc-600 text-[10px] font-black mb-12">
                      <div className="flex flex-col items-start leading-none">
                        <span>{formattedTime}</span>
                        <span className="text-[8px] opacity-60 uppercase tracking-tighter">{formattedLocation}</span>
                      </div>
                      <div className="flex gap-2">
                        <Maximize size={12} className="cursor-pointer hover:text-white" onClick={toggleFullscreen} />
                        <Zap size={14} className="fill-current" />
                      </div>
                    </div>
                    <div className="text-white text-4xl sm:text-6xl font-black tracking-tighter mb-2">{formattedTime}</div>
                    <div className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-16">{formattedDate}</div>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => { setCameraMode(true); if(!isTouchDevice) controlsRef.current?.unlock(); }} className="aspect-square bg-zinc-900 rounded-[24px] flex items-center justify-center text-white hover:bg-zinc-800 transition-all hover:scale-105 shadow-2xl"><Camera size={32} /></button>
                      <button onClick={() => { setGalleryOpen(true); if(!isTouchDevice) controlsRef.current?.unlock(); }} className="aspect-square bg-zinc-900 rounded-[24px] flex items-center justify-center text-white hover:bg-zinc-800 transition-all hover:scale-105 shadow-2xl"><ImageIcon size={32} /></button>
                    </div>
                    <div className="mt-auto text-center opacity-30 text-[8px] uppercase font-black tracking-[0.4em] text-white animate-pulse">Press [C] for Camera</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {hasStarted && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-3 p-2 sm:p-3 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 transition-opacity duration-500"
             style={{ opacity: hotbarOpacity }}>
          {hotbar.map((item, index) => (
            <div key={index} 
                 onClick={() => { setActiveSlot(index); triggerHotbar(); }}
                 className={`w-10 h-10 sm:w-14 sm:h-14 bg-zinc-900/50 border-2 rounded-xl flex items-center justify-center ${activeSlot === index ? 'border-white scale-110 shadow-[0_0_20_rgba(255,255,255,0.2)]' : 'border-white/5'} transition-all duration-300 relative pointer-events-auto cursor-pointer`}>
              {item === 'OPERA_GLASS' && <Binoculars size={20} className="text-white" />}
              {item === 'BOOK' && <BookOpen size={20} className="text-white" />}
              {item === 'SIGNED_BOOK' && <><BookOpen size={20} className="text-yellow-400" /><Star size={10} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-yellow-400 fill-current" /></>}
              <div className="absolute bottom-0 right-1 sm:bottom-1 sm:right-2 text-[8px] sm:text-[10px] text-zinc-600 font-black">{index + 1}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
