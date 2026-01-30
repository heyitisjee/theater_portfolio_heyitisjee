
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Raycaster, Vector2, Euler, Object3D } from 'three';
import { useKeyboard } from '../hooks/useKeyboard';

interface PlayerProps {
  onTargetChange: (targetName: string | null) => void;
  onChairTargetChange: (chairName: string | null) => void;
  onAuditoriumDoorDistanceChange: (isNear: boolean) => void;
  onLobbyDoorDistanceChange: (isNear: boolean) => void;
  onUsherHover: (isHovering: boolean) => void;
  onStageDoorApproach: (isNear: boolean) => void;
  onPerformerHover: (isHovering: boolean) => void;
  onAuditoriumEntry: () => void;
  onAuditoriumExit: () => void;
  onPositionUpdate: (pos: { x: number, y: number, z: number }) => void;
  auditoriumDoorOpen: boolean;
  lobbyDoorOpen: boolean;
  isSitting: boolean;
  sittingChairId: string | null;
  onSecurityViolation: () => void;
  isCameraActive: boolean;
  joystickInput?: { x: number, y: number };
  isTouchDevice?: boolean;
}

const Player: React.FC<PlayerProps> = ({ 
  onTargetChange, 
  onChairTargetChange,
  onAuditoriumDoorDistanceChange,
  onLobbyDoorDistanceChange,
  onUsherHover,
  onStageDoorApproach,
  onPerformerHover,
  onAuditoriumEntry,
  onAuditoriumExit,
  onPositionUpdate,
  auditoriumDoorOpen,
  lobbyDoorOpen,
  isSitting,
  sittingChairId,
  joystickInput = { x: 0, y: 0 },
  isTouchDevice = false
}) => {
  const { camera, scene, gl } = useThree();
  const moveState = useKeyboard();
  const direction = useRef(new Vector3());
  const raycaster = useMemo(() => new Raycaster(), []);
  const centerScreen = useMemo(() => new Vector2(0, 0), []);
  
  const wasNearAuditoriumDoor = useRef(false);
  const wasNearLobbyDoor = useRef(false);
  const wasNearStageDoor = useRef(false);
  const wasHoveringUsher = useRef(false);
  const wasHoveringPerformer = useRef(false);
  const prevZ = useRef(0);
  const sitPosition = useRef(new Vector3());
  const lastTarget = useRef<string | null>(null);
  const lastChair = useRef<string | null>(null);

  // Mobile Look Logic
  const touchStart = useRef({ x: 0, y: 0 });
  const touchRotation = useRef(new Euler(0, 0, 0, 'YXZ'));
  
  const PLAYER_HEIGHT = 2.5;
  const SPEED = 5;

  useEffect(() => {
    if (!isSitting) {
       camera.position.y = PLAYER_HEIGHT;
    }
    prevZ.current = camera.position.z;
    touchRotation.current.copy(camera.rotation);
  }, [isSitting, PLAYER_HEIGHT, camera.position]);

  // Touch handlers for looking around
  useEffect(() => {
    if (!isTouchDevice) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0].clientX < window.innerWidth / 3 && e.touches[0].clientY > window.innerHeight / 2) return;

      const dx = e.touches[0].clientX - touchStart.current.x;
      const dy = e.touches[0].clientY - touchStart.current.y;
      
      touchRotation.current.y -= dx * 0.005;
      touchRotation.current.x -= dy * 0.005;
      touchRotation.current.x = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, touchRotation.current.x));
      
      camera.rotation.copy(touchRotation.current);
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    gl.domElement.addEventListener('touchstart', handleTouchStart);
    gl.domElement.addEventListener('touchmove', handleTouchMove);
    return () => {
      gl.domElement.removeEventListener('touchstart', handleTouchStart);
      gl.domElement.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isTouchDevice, gl, camera]);

  useFrame((state, delta) => {
    if (isSitting && sittingChairId) {
      const chairObj = scene.getObjectByName(sittingChairId);
      if (chairObj) {
         chairObj.getWorldPosition(sitPosition.current);
         sitPosition.current.y += 1.4; 
         camera.position.lerp(sitPosition.current, 0.1);
      }
      return;
    }

    direction.current.set(0, 0, 0);

    const moveX = (Number(moveState.left) - Number(moveState.right)) || -joystickInput.x;
    const moveZ = (Number(moveState.backward) - Number(moveState.forward)) || joystickInput.y;

    const sideVector = new Vector3(moveX, 0, 0);
    const frontVector = new Vector3(0, 0, moveZ);

    direction.current
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(SPEED)
      .applyEuler(camera.rotation);

    direction.current.y = 0;
    
    const nextPos = camera.position.clone().addScaledVector(direction.current, delta);

    let allowMove = true;

    // Door collisions
    if (!auditoriumDoorOpen) {
       if (camera.position.z > 0.5 && nextPos.z < 0.5) allowMove = false;
       if (camera.position.z < -0.5 && nextPos.z > -0.5) allowMove = false;
    } else {
       if ((camera.position.z > 0.5 && nextPos.z < 0.5) || (camera.position.z < -0.5 && nextPos.z > -0.5)) {
         if (Math.abs(nextPos.x) > 2.5) allowMove = false;
       }
    }

    if (!lobbyDoorOpen) {
      if (camera.position.z < 14.5 && nextPos.z > 14.5) allowMove = false;
      if (camera.position.z > 15.5 && nextPos.z < 15.5) allowMove = false;
    } else {
      if ((camera.position.z < 14.8 && nextPos.z > 14.8) || (camera.position.z > 15.2 && nextPos.z < 15.2)) {
        if (Math.abs(nextPos.x) > 2.5) allowMove = false;
      }
    }

    // Boundary restriction: Prevent player from entering the stage area
    if (nextPos.z < -13.0) allowMove = false;
    
    // side walls
    if (Math.abs(nextPos.x) > 7.5) allowMove = false; 
    
    // lobby exterior boundary
    if (nextPos.z > 28) allowMove = false; 

    if (allowMove) {
      camera.position.copy(nextPos);
    }
    
    if (!isSitting) {
       camera.position.y = PLAYER_HEIGHT;
    }

    // Auditorium Entry/Exit Detection (Crossing Z=0)
    if (prevZ.current > 0 && camera.position.z <= 0) {
      onAuditoriumEntry();
    } else if (prevZ.current <= 0 && camera.position.z > 0) {
      onAuditoriumExit();
    }
    prevZ.current = camera.position.z;

    // Report Position
    onPositionUpdate({ x: camera.position.x, y: camera.position.y, z: camera.position.z });

    // Proximity checks
    const distToAudDoor = camera.position.distanceTo(new Vector3(0, PLAYER_HEIGHT, 0));
    const nearAud = distToAudDoor < 3.5;
    if (nearAud !== wasNearAuditoriumDoor.current) {
      wasNearAuditoriumDoor.current = nearAud;
      onAuditoriumDoorDistanceChange(nearAud);
    }

    const distToLobbyDoor = camera.position.distanceTo(new Vector3(0, PLAYER_HEIGHT, 15));
    const nearLob = distToLobbyDoor < 3.5;
    if (nearLob !== wasNearLobbyDoor.current) {
      wasNearLobbyDoor.current = nearLob;
      onLobbyDoorDistanceChange(nearLob);
    }

    const nearStage = nextPos.z > 18;
    if (nearStage !== wasNearStageDoor.current) {
       wasNearStageDoor.current = nearStage;
       onStageDoorApproach(nearStage);
    }

    let foundTarget: string | null = null;
    let foundChair: string | null = null;
    let foundUsher = false;
    let foundPerformer = false;

    raycaster.setFromCamera(centerScreen, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
      for (let i = 0; i < intersects.length; i++) {
         const dist = intersects[i].distance;
         if (dist > 10) continue; 

         let current: Object3D | null = intersects[i].object;
         while (current) {
           if (current.userData.type === 'poster') {
             foundTarget = current.name; 
             break;
           }
           if (current.userData.type === 'chair') {
             foundChair = current.name; 
             break;
           }
           if (current.userData.type === 'usher') {
             foundUsher = true; 
             break;
           }
           if (current.userData.type === 'performer') {
             foundPerformer = true; 
             break;
           }
           current = current.parent;
         }
         if (foundTarget || foundChair || foundUsher || foundPerformer) break;
      }
    }

    if (foundTarget !== lastTarget.current) {
      lastTarget.current = foundTarget;
      onTargetChange(foundTarget);
    }
    if (foundChair !== lastChair.current) {
      lastChair.current = foundChair;
      onChairTargetChange(foundChair);
    }
    if (foundUsher !== wasHoveringUsher.current) {
      wasHoveringUsher.current = foundUsher;
      onUsherHover(foundUsher);
    }
    if (foundPerformer !== wasHoveringPerformer.current) {
      wasHoveringPerformer.current = foundPerformer;
      onPerformerHover(foundPerformer);
    }
  });

  // Adding missing return to satisfy FC type requirement and resolve void error
  return null;
};

// Adding missing default export to fix "module has no default export" error in TheaterScene.tsx
export default Player;
