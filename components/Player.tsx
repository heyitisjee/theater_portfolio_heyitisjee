
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Raycaster, Vector2 } from 'three';
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
  auditoriumDoorOpen: boolean;
  lobbyDoorOpen: boolean;
  isSitting: boolean;
  sittingChairId: string | null;
  onSecurityViolation: () => void;
  isCameraActive: boolean;
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
  auditoriumDoorOpen,
  lobbyDoorOpen,
  isSitting,
  sittingChairId
}) => {
  const { camera, scene } = useThree();
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

  const PLAYER_HEIGHT = 2.5;
  const SPEED = 5;

  useEffect(() => {
    if (!isSitting) {
       camera.position.y = PLAYER_HEIGHT;
    }
    prevZ.current = camera.position.z;
  }, [isSitting, PLAYER_HEIGHT, camera.position]);

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
    const frontVector = new Vector3(0, 0, Number(moveState.backward) - Number(moveState.forward));
    const sideVector = new Vector3(Number(moveState.left) - Number(moveState.right), 0, 0);

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

    if (nextPos.z < -20) allowMove = false;
    if (Math.abs(nextPos.x) > 7.5) allowMove = false; 
    if (nextPos.z > 28) allowMove = false; 

    if (allowMove) {
      camera.position.copy(nextPos);
    }
    
    if (!isSitting) {
       camera.position.y = PLAYER_HEIGHT;
    }

    // Auditorium Entry Detection (Crossing Z=0)
    if (prevZ.current > 0 && camera.position.z <= 0) {
      onAuditoriumEntry();
    }
    prevZ.current = camera.position.z;

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
         const hit = intersects[i].object;
         const dist = intersects[i].distance;
         if (dist > 8) continue; 
         if (hit.userData.type === 'poster') foundTarget = hit.name;
         if (hit.userData.type === 'chair') foundChair = hit.name;
         if (hit.userData.type === 'usher') foundUsher = true;
         if (hit.userData.type === 'performer') foundPerformer = true;
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

  return null;
};

export default Player;
