
import React, { useRef, useMemo, Suspense, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, DoubleSide, Vector3 } from 'three';
import { useGLTF, Float, useAnimations } from '@react-three/drei';

interface LobbyProps {
  highlightedPoster?: string | null;
  auditoriumDoorOpen?: boolean;
  lobbyDoorOpen?: boolean;
  performerArrived?: boolean;
  isNearStageDoor?: boolean;
}

const StageModel: React.FC = () => {
  const { scene } = useGLTF('https://raw.githubusercontent.com/heyitisjee/theater-assets/8618c9db567f0136c585c15f14451496f3c03ea1/STAGE-v1.glb');
  return (
    <primitive 
      object={scene} 
      name="StageModel" 
      position={[0, 0, -11]} 
      rotation={[0, -1.5708, 0]} 
      scale={[0.7, 0.7, 0.7]} 
    />
  );
};

const DancerModel: React.FC = () => {
  const { scene, animations } = useGLTF('https://raw.githubusercontent.com/heyitisjee/theater-assets/8618c9db567f0136c585c15f14451496f3c03ea1/dancing1-v1.glb');
  const { actions } = useAnimations(animations, scene);
  
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const firstAction = actions[Object.keys(actions)[0]];
      firstAction?.play();
    }
  }, [actions]);

  return (
    <primitive 
      object={scene} 
      position={[0.8, 6.0, -15]} 
      rotation={[0, 0, 0]}
      scale={[2.0, 2.0, 2.0]} 
    />
  );
};

// Component for the requested light model
const PropLight: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const { scene } = useGLTF('https://raw.githubusercontent.com/heyitisjee/theater-assets/8618c9db567f0136c585c15f14451496f3c03ea1/light-v1.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  return (
    <group position={position} scale={1.2}>
      <primitive object={clonedScene} />
      <pointLight intensity={20} distance={5} color="#ffccaa" castShadow position={[0, 0.5, 0]} />
    </group>
  );
};

const TheaterSeat: React.FC<{ position: [number, number, number], name: string }> = ({ position, name }) => {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]} rotation={[0, Math.PI, 0]}>
      <mesh 
        name={name}
        userData={{ type: 'chair' }} 
        position={[0, 0.4, 0]}
        castShadow
      >
        <boxGeometry args={[0.9, 0.15, 0.8]} />
        <meshStandardMaterial color="#8b0000" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.8, -0.35]} castShadow>
        <boxGeometry args={[0.9, 0.9, 0.1]} />
        <meshStandardMaterial color="#8b0000" roughness={0.6} />
      </mesh>
      <mesh position={[-0.48, 0.55, 0]} castShadow>
        <boxGeometry args={[0.08, 0.1, 0.6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.48, 0.55, 0]} castShadow>
        <boxGeometry args={[0.08, 0.1, 0.6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
};

const SceneEnvironment: React.FC<{ highlightedPoster?: string | null }> = ({ highlightedPoster }) => {
  const lobbyWidth = 16;
  const lobbyHeight = 8;
  const lobbyDepth = 15; 
  const audDepth = 25; 

  return (
    <group>
      <hemisphereLight intensity={0.6} groundColor="#444" color="#ffffff" />
      
      {/* === LOBBY AREA === */}
      <group position={[0, 0, lobbyDepth / 2]}>
         <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[lobbyWidth, lobbyDepth]} />
            <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0.05} />
         </mesh>

         {/* Sidewalls */}
         <mesh position={[-lobbyWidth/2, lobbyHeight/2, 0]} rotation={[0, Math.PI/2, 0]}>
            <planeGeometry args={[lobbyDepth, lobbyHeight]} />
            <meshStandardMaterial color="#ffffff" side={DoubleSide} />
         </mesh>
         <mesh position={[lobbyWidth/2, lobbyHeight/2, 0]} rotation={[0, -Math.PI/2, 0]}>
            <planeGeometry args={[lobbyDepth, lobbyHeight]} />
            <meshStandardMaterial color="#ffffff" side={DoubleSide} />
         </mesh>

         {/* Posters */}
         <mesh name="Crimson Specter Poster" userData={{ type: 'poster' }} position={[-lobbyWidth / 2 + 0.1, 1.7, -2]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[2, 3]} />
            <meshStandardMaterial color="#900" emissive="#f00" emissiveIntensity={highlightedPoster === "Crimson Specter Poster" ? 1.0 : 0} />
         </mesh>
         <mesh name="Emerald Voyage Poster" userData={{ type: 'poster' }} position={[lobbyWidth / 2 - 0.1, 1.7, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[2, 3]} />
            <meshStandardMaterial color="#060" emissive="#0f0" emissiveIntensity={highlightedPoster === "Emerald Voyage Poster" ? 1.0 : 0} />
         </mesh>
         <mesh name="Azure Echo Poster" userData={{ type: 'poster' }} position={[-lobbyWidth / 2 + 0.1, 1.7, 2]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[2, 3]} />
            <meshStandardMaterial color="#006" emissive="#00f" emissiveIntensity={highlightedPoster === "Azure Echo Poster" ? 1.2 : 0} />
         </mesh>
      </group>

      {/* Auditorium Divider Wall (Z=0) */}
      <group position={[0, lobbyHeight / 2, 0]}>
          <mesh position={[-5, 0, 0]}><boxGeometry args={[6, lobbyHeight, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[5, 0, 0]}><boxGeometry args={[6, lobbyHeight, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0, 3, 0]}><boxGeometry args={[4, 2, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
      </group>

      {/* Exit Door Wall (Z=15) */}
      <group position={[0, lobbyHeight / 2, 15]}>
          <mesh position={[-5, 0, 0]}><boxGeometry args={[6, lobbyHeight, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[5, 0, 0]}><boxGeometry args={[6, lobbyHeight, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0, 3, 0]}><boxGeometry args={[4, 2, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
      </group>

      {/* Lobby Ceiling */}
      <mesh position={[0, lobbyHeight, lobbyDepth/2]} rotation={[Math.PI/2, 0, 0]}>
         <planeGeometry args={[lobbyWidth, lobbyDepth]} />
         <meshStandardMaterial color="#222" />
      </mesh>

      {/* === OUTSIDE AREA === */}
      <group position={[0, 0, 15]}>
         <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 7.5]}>
            <planeGeometry args={[20, 15]} />
            <meshStandardMaterial color="#111" />
         </mesh>
         <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 7.5]}>
            <planeGeometry args={[3, 15]} />
            <meshStandardMaterial color="#500" />
         </mesh>
         {[...Array(6)].map((_, i) => (
           <React.Fragment key={i}>
             <mesh position={[-1.6, 0.5, 2 + i * 2]}><cylinderGeometry args={[0.05, 0.05, 1]} /><meshStandardMaterial color="#888" metalness={1} /></mesh>
             <mesh position={[1.6, 0.5, 2 + i * 2]}><cylinderGeometry args={[0.05, 0.05, 1]} /><meshStandardMaterial color="#888" metalness={1} /></mesh>
           </React.Fragment>
         ))}
         <mesh position={[-1.6, 0.8, 7.5]}><boxGeometry args={[0.05, 0.05, 12]} /><meshStandardMaterial color="#b00" /></mesh>
         <mesh position={[1.6, 0.8, 7.5]}><boxGeometry args={[0.05, 0.05, 12]} /><meshStandardMaterial color="#b00" /></mesh>
      </group>

      {/* === AUDITORIUM AREA === */}
      <group position={[0, 0, -audDepth / 2]}>
         <Suspense fallback={null}>
            <StageModel />
            <DancerModel />
         </Suspense>

         <mesh position={[0, 10, 0]} rotation={[Math.PI/2, 0, 0]}>
             <planeGeometry args={[20, audDepth]} />
             <meshStandardMaterial color="#111" />
         </mesh>

         {/* 3 ROWS OF SEATING */}
         <group position={[0, 0, 8]}> 
            {[0, 1, 2].map((row) => {
               const riserHeight = (2 - row) * 0.4;
               const zOffset = row * -2.4; 
               return (
                 <group key={`row-group-${row}`}>
                   <mesh position={[0, riserHeight / 2, zOffset]} receiveShadow>
                      <boxGeometry args={[12, riserHeight + 0.05, 2.4]} />
                      <meshStandardMaterial color="#050505" />
                   </mesh>
                   {[-3, -1.5, 0, 1.5, 3].map((col) => (
                     <TheaterSeat 
                        key={`Chair-${row}-${col}`} 
                        name={`Chair-${row}-${col}`}
                        position={[col, riserHeight, zOffset]}
                     />
                   ))}
                 </group>
               );
            })}
         </group>
      </group>
    </group>
  );
};

const SceneDoors: React.FC<{ auditoriumOpen?: boolean, lobbyOpen?: boolean }> = ({ auditoriumOpen, lobbyOpen }) => {
  const leftAudDoorRef = useRef<Mesh>(null);
  const rightAudDoorRef = useRef<Mesh>(null);
  const leftLobbyDoorRef = useRef<Mesh>(null);
  const rightLobbyDoorRef = useRef<Mesh>(null);

  useFrame(() => {
    // Auditorium Doors
    if (leftAudDoorRef.current && rightAudDoorRef.current) {
      const targetPos = auditoriumOpen ? 2.5 : 1;
      leftAudDoorRef.current.position.x += ((-targetPos) - leftAudDoorRef.current.position.x) * 0.1;
      rightAudDoorRef.current.position.x += (targetPos - rightAudDoorRef.current.position.x) * 0.1;
    }

    // Lobby Doors
    if (leftLobbyDoorRef.current && rightLobbyDoorRef.current) {
      const targetPos = lobbyOpen ? 2.5 : 1;
      leftLobbyDoorRef.current.position.x += ((-targetPos) - leftLobbyDoorRef.current.position.x) * 0.1;
      rightLobbyDoorRef.current.position.x += (targetPos - rightLobbyDoorRef.current.position.x) * 0.1;
    }
  });

  return (
    <group>
       <group position={[0, 0, 0]}>
          <mesh ref={leftAudDoorRef} position={[-1, 4, 0]}>
             <boxGeometry args={[2, 8, 0.2]} />
             <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh ref={rightAudDoorRef} position={[1, 4, 0]}>
             <boxGeometry args={[2, 8, 0.2]} />
             <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
          </mesh>
       </group>
       <group position={[0, 0, 15]}>
          <mesh ref={leftLobbyDoorRef} position={[-1, 4, 0]}>
             <boxGeometry args={[2, 8, 0.2]} />
             <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh ref={rightLobbyDoorRef} position={[1, 4, 0]}>
             <boxGeometry args={[2, 8, 0.2]} />
             <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
          </mesh>
       </group>
    </group>
  );
};

const SceneCharacters: React.FC<{ lobbyDoorOpen?: boolean, performerArrived?: boolean, isNearStageDoor?: boolean }> = ({ lobbyDoorOpen, performerArrived, isNearStageDoor }) => {
  const lobbyPerformerRef = useRef<Group>(null);
  const flashGroupRef = useRef<Group>(null);

  useFrame((state, delta) => {
    // Performer only starts moving if the lobby door has been opened
    if (lobbyPerformerRef.current && performerArrived && lobbyDoorOpen) {
       const targetZ = 20.0; 
       if (lobbyPerformerRef.current.position.z > targetZ) {
          lobbyPerformerRef.current.position.z -= delta * 2.0; 
          lobbyPerformerRef.current.position.y = Math.sin(state.clock.elapsedTime * 10) * 0.05;
       } else {
          lobbyPerformerRef.current.position.z = targetZ;
          lobbyPerformerRef.current.position.y = 0;
       }
    }
    
    // Paparazzi flashes
    if (flashGroupRef.current) {
       if (lobbyDoorOpen && isNearStageDoor) {
          flashGroupRef.current.visible = Math.random() > 0.96;
       } else {
          flashGroupRef.current.visible = false;
       }
    }
  });

  return (
    <group>
      <group position={[2.5, 1.5, 0.5]}>
         <mesh userData={{ type: 'usher' }}>
            <capsuleGeometry args={[0.4, 1.8, 4, 8]} />
            <meshStandardMaterial color="#333" />
         </mesh>
         <mesh position={[0, 1.4, 0]}>
            <sphereGeometry args={[0.25]} />
            <meshStandardMaterial color="#eec" />
         </mesh>
      </group>

      <group position={[4.5, 0, 22]}>
         {[-0.5, 0.5].map((x, i) => (
           <mesh key={i} position={[x, 1, 0]}>
             <capsuleGeometry args={[0.3, 1.4, 4, 8]} />
             <meshStandardMaterial color="#222" />
           </mesh>
         ))}
      </group>
      <group position={[-4.5, 0, 22]}>
         {[-0.5, 0.5].map((x, i) => (
           <mesh key={i} position={[x, 1, 0]}>
             <capsuleGeometry args={[0.3, 1.4, 4, 8]} />
             <meshStandardMaterial color="#222" />
           </mesh>
         ))}
      </group>

      <group ref={lobbyPerformerRef} position={[0, 0, 35]} visible={performerArrived && lobbyDoorOpen}>
         <mesh userData={{ type: 'performer' }}>
             <capsuleGeometry args={[0.35, 1.7, 4, 8]} />
             <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
         </mesh>
      </group>

      <group ref={flashGroupRef} position={[0, 3, 18]} visible={false}>
         <pointLight position={[-2, 0, 0]} intensity={30} distance={15} color="#fff" />
         <pointLight position={[2, 0.5, 0]} intensity={30} distance={15} color="#ccf" />
         <pointLight position={[0, 2, 5]} intensity={20} distance={10} color="#fff" />
      </group>
    </group>
  );
};

const Lobby: React.FC<LobbyProps> = ({ 
  highlightedPoster, 
  auditoriumDoorOpen,
  lobbyDoorOpen,
  performerArrived,
  isNearStageDoor 
}) => {
  return (
    <group>
      <SceneEnvironment highlightedPoster={highlightedPoster} />
      <SceneDoors auditoriumOpen={auditoriumDoorOpen} lobbyOpen={lobbyDoorOpen} />
      <SceneCharacters 
        lobbyDoorOpen={lobbyDoorOpen}
        performerArrived={performerArrived} 
        isNearStageDoor={isNearStageDoor} 
      />
      {/* Positioned on the front row center chair */}
      <Suspense fallback={null}>
        <PropLight position={[0, 0.85, -9.3]} />
      </Suspense>
    </group>
  );
};

export default Lobby;
