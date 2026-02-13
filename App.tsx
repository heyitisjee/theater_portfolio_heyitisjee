
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import TheaterScene from './components/TheaterScene';
import { X, BookOpen, Star, Binoculars, Trash2, ChevronLeft, ChevronRight, Ticket } from 'lucide-react';

export type ItemType = 'EMPTY' | 'OPERA_GLASS' | 'BOOK' | 'SIGNED_BOOK' | 'TICKET' | null;

const TICKET_URL = "https://raw.githubusercontent.com/heyitisjee/theater-assets/b9a54a949ffb47aad1a5427d0684bdd2eb75c0d5/Screen%20Shot%202026-02-13%20at%205.08.04%20PM.png";

const PROGRAM_PAGES = [
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/b1960f5ef0a3ec18401b799b50491f642393eb17/1.png",
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/2.png",
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/3.png",
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/aa423786de2867da409b338855f8f990476fe518/4.png", 
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/5.png"
];

const SIGNED_PROGRAM_FIRST_PAGE = "https://raw.githubusercontent.com/heyitisjee/theater-assets/4d5f2760862aafd7a1401227e94afb0f8e6562cb/Hyeji%20Kim%20portfolio%202026.png";

const SOUNDTRACKS = [
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/72545251b5f393d7c81fbaac3e09def7880d7639/Charlotte's%20Web%20(1973)%20Sountrack%20-%20Chin%20Up%20-%20CineTracks.mp3",
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/72545251b5f393d7c81fbaac3e09def7880d7639/Little%20Girls%20(From%20the%20Annie%20(2014)%20Original%20Movie%20Soundtrack)%20-%20Cameron%20Diaz.mp3",
  "https://raw.githubusercontent.com/heyitisjee/theater-assets/72545251b5f393d7c81fbaac3e09def7880d7639/No%20More%20-%20Chip%20Zien.mp3"
];

const App: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hotbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const randomHintIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [hasStarted, setHasStarted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Starting with a ticket in hand (Slot 3)
  const [hotbar, setHotbar] = useState<ItemType[]>(['EMPTY', 'OPERA_GLASS', 'TICKET', null, null]);
  const [activeSlot, setActiveSlot] = useState<number>(2); // Start with Ticket selected
  const [showHotbar, setShowHotbar] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [inventory, setInventory] = useState<string[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [celebFlash, setCelebFlash] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [stagePerformerIndex, setStagePerformerIndex] = useState(0);
  const [isPerformerSigning, setIsPerformerSigning] = useState(false);
  const [isInAuditorium, setIsInAuditorium] = useState(false);

  const [targetedPoster, setTargetedPoster] = useState<string | null>(null);
  const [isHoveringUsher, setIsHoveringUsher] = useState(false);
  const [isHoveringPerformer, setIsHoveringPerformer] = useState(false);
  const [auditoriumDoorOpen, setAuditoriumDoorOpen] = useState(false);
  const [lobbyDoorOpen, setLobbyDoorOpen] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  const [sittingChair, setSittingChair] = useState<string | null>(null);
  const [targetChair, setTargetChair] = useState<string | null>(null);
  const [performerArrived, setPerformerArrived] = useState(false);
  const [interactionText, setInteractionText] = useState<string | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<string | null>(null);
  const [hasShownStageDoorPrompt, setHasShownStageDoorPrompt] = useState(false);

  const hasProgram = hotbar.includes('BOOK') || hotbar.includes('SIGNED_BOOK');
  const equippedItem = hotbar[activeSlot];

  // Usher hints logic
  useEffect(() => {
    if (hasStarted && !isInAuditorium) {
      // Random gallery hint every 60-90 seconds
      const triggerRandomHint = () => {
        if (!isInAuditorium && !activeDialogue && inventory.length > 0) {
          setActiveDialogue("Usher: You can see your captured photos by pressing 'V'.");
          setTimeout(() => setActiveDialogue(null), 5000);
        }
      };
      
      randomHintIntervalRef.current = setInterval(() => {
        if (Math.random() > 0.5) triggerRandomHint();
      }, 70000);
    }

    return () => {
      if (randomHintIntervalRef.current) clearInterval(randomHintIntervalRef.current);
    };
  }, [hasStarted, isInAuditorium, inventory.length]);

  useEffect(() => {
    if (hasStarted) {
      setShowHotbar(true);
      if (hotbarTimerRef.current) clearTimeout(hotbarTimerRef.current);
      hotbarTimerRef.current = setTimeout(() => setShowHotbar(false), 4000);
    }
  }, [hasStarted, hotbar]);

  // Items that can be inspected full-screen (Book, Signed Book, Ticket)
  const isInspectable = equippedItem === 'BOOK' || equippedItem === 'SIGNED_BOOK' || equippedItem === 'TICKET';
  const currentTargetFov = (equippedItem === 'OPERA_GLASS' && isZooming) ? 30 : 75;

  useEffect(() => {
    const shouldPlay = isInAuditorium && isSitting && hasStarted;
    if (shouldPlay) {
      const trackUrl = SOUNDTRACKS[stagePerformerIndex] || SOUNDTRACKS[0];
      if (!audioRef.current || audioRef.current.src !== trackUrl) {
        if(audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(trackUrl);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.12; 
        audioRef.current.play().catch(() => {});
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [isSitting, stagePerformerIndex, hasStarted, isInAuditorium]);

  const takePhoto = useCallback((dataUrl?: string) => {
    setFlash(true); 
    setTimeout(() => setFlash(false), 100);
    
    if (dataUrl) {
      setInventory(prev => [dataUrl, ...prev]);
    } else {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        setInventory(prev => [canvas.toDataURL('image/png'), ...prev]);
      }
    }
  }, []);

  const receiveBook = useCallback(() => {
    // Replaces slot 2 (Ticket) with the Program Book
    setHotbar(prev => { let n = [...prev]; n[2] = 'BOOK'; return n; });
    setActiveSlot(2); setAuditoriumDoorOpen(true);
    setActiveDialogue("Usher: Here is your program. Enjoy the show!");
    setTimeout(() => setActiveDialogue(null), 3500);
  }, []);

  const receiveAutograph = useCallback(() => {
     if (hasProgram && hotbar.includes('BOOK')) {
       setIsPerformerSigning(true);
       setHotbar(prev => { 
         let n = [...prev]; 
         const idx = n.indexOf('BOOK');
         if(idx !== -1) n[idx] = 'SIGNED_BOOK'; 
         return n; 
       });
       setActiveDialogue("Performer: Here's my autograph! Hope you liked the show!");
       setTimeout(() => { setIsPerformerSigning(false); setActiveDialogue(null); }, 3000);
     } else if (hotbar.includes('SIGNED_BOOK')) {
       setActiveDialogue("Performer: Thanks for coming! Safe travels!");
       setTimeout(() => setActiveDialogue(null), 3000);
     }
  }, [hasProgram, hotbar]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => { 
      if (e.button === 2) setIsZooming(true); 
      if (e.button === 0 && isInspectable && isLocked && !cameraMode && !galleryOpen) {
        setIsReading(prev => !prev); if (!isReading) setCurrentPage(0);
      }
    };
    const handleMouseUp = (e: MouseEvent) => { if (e.button === 2) setIsZooming(false); };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReading) {
        if (equippedItem !== 'TICKET') {
          if (e.code === 'ArrowRight' || e.code === 'Space') { setCurrentPage(p => (p + 1) % PROGRAM_PAGES.length); return; }
          if (e.code === 'ArrowLeft') { setCurrentPage(p => (p - 1 + PROGRAM_PAGES.length) % PROGRAM_PAGES.length); return; }
        }
      }
      if (['1', '2', '3', '4', '5'].includes(e.key)) setActiveSlot(parseInt(e.key) - 1);
      switch(e.code) {
        case 'KeyZ': setIsZooming(true); break;
        case 'KeyC': 
          setCameraMode(p => !p); 
          setGalleryOpen(false); 
          break;
        case 'KeyV': 
          setGalleryOpen(p => !p); 
          setCameraMode(false); 
          break;
        case 'Space':
          if (cameraMode && !isReading) takePhoto();
          break;
        case 'KeyE': case 'KeyR':
          if (isHoveringUsher) { if (hotbar.includes('TICKET')) receiveBook(); else setAuditoriumDoorOpen(true); }
          break;
        case 'KeyG': if (isHoveringPerformer && performerArrived) receiveAutograph(); break;
        case 'KeyF':
          if (isSitting) { setIsSitting(false); setSittingChair(null); }
          else if (targetChair && isInAuditorium) { setIsSitting(true); setSittingChair(targetChair); }
          break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'KeyZ') setIsZooming(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isLocked, hasStarted, cameraMode, galleryOpen, isInspectable, hotbar, isHoveringUsher, isHoveringPerformer, performerArrived, targetChair, isSitting, takePhoto, receiveBook, receiveAutograph, isInAuditorium, hasProgram, equippedItem, isReading]);

  useEffect(() => {
    let text: string | null = null;
    let autoHide = false;

    if (activeDialogue) {
      text = activeDialogue;
    } else if (isReading) {
      text = "Inspecting Item | Press [ESC] to Stop";
    } else if (isSitting) {
      text = "Press [F] to Stand";
      autoHide = true;
    } else if (targetChair && isInAuditorium) {
      text = "Press [F] to Sit";
      autoHide = true;
    } else if (isHoveringUsher) {
      text = hotbar.includes('TICKET') ? "Show Ticket to Usher [R]" : "Talk to Usher [R]";
    } else if (isHoveringPerformer && performerArrived) {
      text = hotbar.includes('SIGNED_BOOK') ? "Greet Performer [G]" : "Get Signed Program [G]";
    }

    setInteractionText(text);

    if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    if (autoHide && text) {
      promptTimerRef.current = setTimeout(() => {
        setInteractionText(null);
      }, 3000);
    }
  }, [activeDialogue, isReading, isSitting, targetChair, isHoveringUsher, isHoveringPerformer, performerArrived, cameraMode, isInAuditorium, hotbar]);

  return (
    <div className="relative w-full h-full bg-[#020202] select-none overflow-hidden font-sans">
      {isLocked && !cameraMode && !galleryOpen && !isReading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none">
          <div className="w-1.5 h-1.5 bg-white rounded-full border border-black/50" />
        </div>
      )}

      {/* Persistence Shortcuts Overlay */}
      {hasStarted && !isReading && (
        <div className="absolute bottom-10 left-10 z-[150] pointer-events-none flex flex-col gap-1 text-white/50 font-black uppercase tracking-[0.2em] text-[9px] drop-shadow-lg text-left">
          <p>WASD to move</p>
          <p>C for camera</p>
          <p>V for gallery</p>
          <p className="text-white/80 animate-pulse mt-2">Try taking pictures of the posters!</p>
        </div>
      )}

      <div className={`transition-opacity duration-1000 w-full h-full z-10 relative ${hasStarted ? 'opacity-100' : 'opacity-0'}`}>
        <Canvas shadows camera={{ fov: 75, position: [0, 2.5, 5] }} gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true, powerPreference: 'high-performance' }} dpr={[1, 1.5]}>
          <TheaterScene 
            onTargetChange={setTargetedPoster} 
            onChairTargetChange={setTargetChair}
            onAuditoriumDoorDistanceChange={() => {}}
            onLobbyDoorDistanceChange={setLobbyDoorOpen}
            onUsherHover={setIsHoveringUsher}
            onStageDoorApproach={(near) => { 
              if (near) {
                if (!performerArrived && !isInAuditorium) {
                  if (hasProgram) {
                    setPerformerArrived(true);
                    setLobbyDoorOpen(true);
                    setCelebFlash(true);
                    setTimeout(() => setCelebFlash(false), 100);
                  } else if (!hasShownStageDoorPrompt) {
                    setHasShownStageDoorPrompt(true);
                    setActiveDialogue("The stage door opens after you've seen the show!");
                    setTimeout(() => setActiveDialogue(null), 4000);
                  }
                } else if (performerArrived) {
                  setLobbyDoorOpen(true);
                }
              } else {
                setLobbyDoorOpen(false); 
              }
            }}
            onPerformerHover={setIsHoveringPerformer}
            onAuditoriumEntry={() => { 
              if (!hasProgram) {
                setActiveDialogue("Usher: Let me check your ticket please!");
                setTimeout(() => setActiveDialogue(null), 4000);
              } else {
                setIsInAuditorium(true); 
                setStagePerformerIndex(Math.floor(Math.random() * 3)); 
              }
            }}
            onAuditoriumExit={() => { setIsInAuditorium(false); setAuditoriumDoorOpen(false); }}
            onPositionUpdate={(pos) => {}}
            highlightedPoster={targetedPoster} 
            auditoriumDoorOpen={auditoriumDoorOpen}
            lobbyDoorOpen={lobbyDoorOpen}
            isSitting={isSitting}
            sittingChairId={sittingChair}
            isCameraActive={cameraMode}
            performerArrived={performerArrived}
            stagePerformerIndex={stagePerformerIndex}
            isPerformerSigning={isPerformerSigning}
            fov={currentTargetFov}
            isInAuditorium={isInAuditorium}
            equippedItem={equippedItem}
            hasProgram={hasProgram}
            phoneProps={{
              cameraMode,
              setCameraMode,
              galleryOpen,
              setGalleryOpen,
              inventory,
              setInventory,
              takePhoto,
              flash,
              targetedPoster
            }}
          />
          {hasStarted && <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />}
        </Canvas>
      </div>

      {!hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center z-[200] bg-zinc-950 text-white p-8">
          <div className="text-center max-w-5xl flex flex-col items-center">
            <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter leading-tight mb-4">Hyeji Kim Portfolio</h1>
            <p className="text-white/60 mb-16 text-[14px] font-normal uppercase tracking-[0.5em] leading-relaxed max-w-2xl mx-auto">
              show starting in 5.....4....3...2..1!
            </p>
            <button className="px-10 py-3 bg-white text-black font-black hover:scale-105 transition-transform uppercase tracking-[0.3em] text-[11px] shadow-[0_0_80px_rgba(255,255,255,0.2)]" onClick={() => setHasStarted(true)}>Enter Experience</button>
          </div>
        </div>
      )}

      {interactionText && !isReading && !cameraMode && !galleryOpen && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-[150] pointer-events-none transition-all duration-500 top-[22%] scale-100`}>
          <div className="bg-white/95 px-10 py-3 rounded-full text-black text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl border border-black/10 animate-pulse">
            {interactionText}
          </div>
        </div>
      )}

      {isReading && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-12 animate-in fade-in duration-500">
           {equippedItem === 'TICKET' ? (
             <img src={TICKET_URL} className="max-w-[90vw] max-h-[70vh] object-contain shadow-[0_0_120px_rgba(255,255,255,0.1)] rounded-sm" />
           ) : (
             <>
               <img src={(currentPage === 0 && equippedItem === 'SIGNED_BOOK') ? SIGNED_PROGRAM_FIRST_PAGE : PROGRAM_PAGES[currentPage]} className="h-full max-h-[85vh] object-contain shadow-[0_0_120px_rgba(0,0,0,0.9)] rounded-sm" />
               <div className="absolute bottom-12 flex gap-10">
                  <button onClick={() => setCurrentPage(p => (p - 1 + PROGRAM_PAGES.length) % PROGRAM_PAGES.length)} className="p-8 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-90"><ChevronLeft size={56}/></button>
                  <button onClick={() => setCurrentPage(p => (p + 1) % PROGRAM_PAGES.length)} className="p-8 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-90"><ChevronRight size={56}/></button>
               </div>
             </>
           )}
           <button onClick={() => setIsReading(false)} className="absolute top-12 right-12 p-5 text-white hover:bg-white/10 rounded-full transition-all"><X size={40}/></button>
        </div>
      )}

      <div className={`fixed inset-0 bg-white pointer-events-none z-[1000] transition-opacity duration-150 ${flash || celebFlash ? 'opacity-30' : 'opacity-0'}`} />

      {hasStarted && !isReading && !cameraMode && !galleryOpen && (
        <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex gap-4 p-4 bg-black/85 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] flex-nowrap min-w-max transition-all duration-700 ${showHotbar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          {hotbar.map((item, index) => (
            <div key={index} onClick={() => setActiveSlot(index)} className={`w-16 h-16 bg-zinc-900/70 border-2 rounded-[1.5rem] flex items-center justify-center ${activeSlot === index ? 'border-white scale-110 shadow-[0_0_40px_rgba(255,255,255,0.3)]' : 'border-white/5 hover:border-white/20'} transition-all duration-300 cursor-pointer relative group flex-shrink-0`}>
              {item === 'OPERA_GLASS' && <Binoculars size={32} className="text-white transition-transform group-hover:scale-110" />}
              {item === 'BOOK' && <BookOpen size={32} className="text-white transition-transform group-hover:scale-110" />}
              {item === 'SIGNED_BOOK' && <div className="relative group-hover:scale-110 transition-transform"><BookOpen size={32} className="text-yellow-400" /><Star size={14} className="absolute -top-1 -right-1 text-yellow-400 fill-current" /></div>}
              {item === 'TICKET' && <Ticket size={32} className="text-white transition-transform group-hover:scale-110" />}
              <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-white text-black text-[10px] rounded-full flex items-center justify-center font-black shadow-2xl">{index + 1}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
