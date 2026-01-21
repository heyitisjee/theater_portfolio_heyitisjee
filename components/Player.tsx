
import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Raycaster, Vector2 } from 'three';
import { useKeyboard } from '../hooks/useKeyboard';

interface PlayerProps {
  onTargetChange: (targetName: string | null) => void;
  onChairTargetChange: (chairName: string | null) => void;
  onAuditoriumDoorDistanceChange: (isNear: boolean) => void;
  onUsherHover: (isHovering: boolean) => void;
  onStageDoorApproach: (isNear: boolean) => void;
  onPerformerHover: (isHovering: boolean) => void;
  auditoriumDoorOpen: boolean;
  isSitting: boolean;
  sittingChairId: string | null;
  onSecurityViolation: () => void;
  isCameraActive: boolean;
}

const Player: React.FC<PlayerProps> = ({ 
  onTargetChange, 
  onChairTargetChange,
  onAuditoriumDoorDistanceChange,
  onUsherHover,
  onStageDoorApproach,
  onPerformerHover,
  auditoriumDoorOpen,
  isSitting,
  sittingChairId,
  isCameraActive
}) => {
  const { camera, scene } = useThree();
  const moveState = useKeyboard();
  const direction = useRef(new Vector3());
  const raycaster = useMemo(() => new Raycaster(), []);
  const centerScreen = useMemo(() => new Vector2(0, 0), []);
  
  const lastTarget = useRef<string | null>(null);
  const lastChair = useRef<string | null>(null);
  const wasNearAuditoriumDoor = useRef(false);
  const wasNearStageDoor = useRef(false);
  const wasHoveringUsher = useRef(false);
  const wasHoveringPerformer = useRef(false);
  const sitPosition = useRef<Vector3>(new Vector3());

  const SPEED = 5;

  useFrame((state, delta) => {
    // SITTING LOGIC
    if (isSitting && sittingChairId) {
      // Find world position of the chair
      const chairObj = scene.getObjectByName(sittingChairId);
      if (chairObj) {
         // Chairs are in groups, need world position
         chairObj.getWorldPosition(sitPosition.current);
         // Adjust for sitting height and slightly forward
         sitPosition.current.y = 1.2; 
         // Lock Camera
         camera.position.lerp(sitPosition.current, 0.1);
      }
      return; // Stop movement processing
    }

    // MOVEMENT LOGIC
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

    // COLLISION LOGIC
    let allowMove = true;

    // 1. Divider Wall at Z=0 (approx thickness 1)
    if (!auditoriumDoorOpen) {
       // If trying to cross Z=0 from either side
       if ((camera.position.z > 0.5 && nextPos.z < 0.5) || (camera.position.z < -0.5 && nextPos.z > -0.5)) {
          // Check door width (x -1 to 1)
          if (Math.abs(nextPos.x) > 1) {
             allowMove = false;
          } else {
            // Hitting closed door
            allowMove = false; 
          }
       }
    } else {
       // Door is open, check wall collision only
       if ((camera.position.z > 0.5 && nextPos.z < 0.5) || (camera.position.z < -0.5 && nextPos.z > -0.5)) {
         if (Math.abs(nextPos.x) > 1.2) { // Wall starts at x=1
            allowMove = false;
         }
       }
    }

    // 2. Stage Barrier (Auditorium) (Z < -20)
    if (nextPos.z < -22) {
       allowMove = false;
    }

    // 3. Stage Door Barricade (Outside)
    // Barricade is at z=30. Player and crowd are on z < 30 side.
    if (nextPos.z > 29) {
       allowMove = false;
    }

    // 4. Outer Walls
    if (Math.abs(nextPos.x) > 7.5) allowMove = false; // Side walls
    if (nextPos.z > 39.5) allowMove = false; // Outside End (Street End)
    if (nextPos.z < -29.5) allowMove = false; // Auditorium Back

    if (allowMove) {
      camera.position.copy(nextPos);
    }
    
    // Standing Height
    if (!isSitting) {
       camera.position.y = 1.7;
    }

    // INTERACTION CHECKS
    
    // Auditorium Door (at z=0)
    const distToDoor = camera.position.distanceTo(new Vector3(0, 1.7, 0));
    const nearAud = distToDoor < 3;
    if (nearAud !== wasNearAuditoriumDoor.current) {
      wasNearAuditoriumDoor.current = nearAud;
      onAuditoriumDoorDistanceChange(nearAud);
    }

    // Stage Door Area (Outside)
    // Trigger when player is outside on the street (z > 25)
    const nearStage = camera.position.z > 25;

    if (nearStage !== wasNearStageDoor.current) {
       wasNearStageDoor.current = nearStage;
       onStageDoorApproach(nearStage);
    }

    // --- TARGET DETECTION LOGIC ---
    let foundTarget: string | null = null;
    let foundChair: string | null = null;
    let foundUsher = false;
    let foundPerformer = false;

    if (isCameraActive) {
      // ** AR MODE: FRUSTUM / SCREEN SPACE DETECTION FOR POSTERS **
      let closestPosterDist = Infinity;

      scene.traverse((obj) => {
        if (obj.userData.type === 'poster') {
          // IMPORTANT: Use getWorldPosition because posters are inside the Lobby group.
          const worldPos = new Vector3();
          obj.getWorldPosition(worldPos);

          // 1. Check Distance (Relaxed to 20 units)
          const dist = camera.position.distanceTo(worldPos);
          if (dist < 20) {
            // 2. Project to Screen Space
            const screenPos = worldPos.clone();
            screenPos.project(camera);

            const x = screenPos.x;
            const y = screenPos.y;
            const z = screenPos.z;

            // 3. Check bounds 
            // Normalized Device Coordinates (NDC) range from -1 to 1.
            // z range is also -1 to 1 (where -1 is near plane, 1 is far plane).
            // We want object to be centrally located (e.g., within 60% of screen center)
            const isCentered = Math.abs(x) < 0.6 && Math.abs(y) < 0.6;
            const isInFrustumDepth = Math.abs(z) < 1;

            if (isCentered && isInFrustumDepth) {
               // Prioritize closest to center of screen
               const distToCenter = Math.sqrt(x*x + y*y);
               if (distToCenter < closestPosterDist) {
                 closestPosterDist = distToCenter;
                 foundTarget = obj.name;
               }
            }
          }
        }
      });
      
    } else {
      // ** ROAMING MODE: RAYCASTING (Strict Center) **
      raycaster.setFromCamera(centerScreen, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      if (intersects.length > 0) {
        for (let i = 0; i < intersects.length; i++) {
           const hit = intersects[i].object;
           const dist = intersects[i].distance;
           if (dist > 10) continue; // Increased interaction distance for performer
           
           if (hit.userData.type === 'chair') {
              foundChair = hit.name;
              break;
           }

           if (hit.userData.type === 'usher') {
              foundUsher = true;
              break; 
           }

           if (hit.userData.type === 'performer') {
              foundPerformer = true;
              break;
           }
        }
      }
    }

    // Update State
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
