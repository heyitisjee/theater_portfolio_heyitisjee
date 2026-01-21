
import React, { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, DoubleSide } from 'three';
import { useGLTF, Float } from '@react-three/drei';

interface LobbyProps {
  highlightedPoster?: string | null;
  auditoriumDoorOpen?: boolean;
  performerArrived?: boolean;
  isNearStageDoor?: boolean;
}

const Chandelier: React.FC = () => {
  // Using the raw URL for the GLB asset to ensure it loads in a browser environment
  const { scene } = useGLTF('https://raw.githubusercontent.com/heyitisjee/theater-assets/50c275f97ff96a359396af758325ff7d111ccf39/light-v1.glb');
  
  // Clone the scene to ensure it can be safely used and manipulated within this component instance
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const lightRef = useRef<any>(null);

  useFrame((state) => {
    if (lightRef.current) {
      // Create a smooth, ethereal pulsing effect for the light intensity
      lightRef.current.intensity = 50 + Math.sin(state.clock.elapsedTime * 1.5) * 20;
    }
  });

  return (
    <group>
      {/* Hanging Cable: Connects the chandelier to the ceiling for a realistic "dropping" effect */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 4]} />
        <meshStandardMaterial color="#0a0a0a" metalness={1} roughness={0.1} />
      </mesh>

      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.4}>
        <group scale={3.5}> {/* Increased scale significantly to ensure it is clearly visible */}
          <primitive object={clonedScene} />
          
          {/* Main ethereal light source coming from the model */}
          <pointLight 
            ref={lightRef}
            intensity={50} 
            distance={40} 
            color="#fff4d6" 
            castShadow 
          />
          
          {/* Glow Core: A visual representation of the light source within the model */}
          <mesh>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial 
              emissive="#fff4d6" 
              emissiveIntensity={12} 
              color="#ffffff"
              transparent
              opacity={0.9}
            />
          </mesh>
        </group>
      </Float>
    </group>
  );
};

// --- 1. ENVIRONMENT (Static Geometry: Walls, Lights, Furniture, Posters) ---
const SceneEnvironment: React.FC<{ highlightedPoster?: string | null }> = ({ highlightedPoster }) => {
  const lobbyWidth = 16;
  const lobbyHeight = 8;
  const lobbyDepth = 20; 
  const audWidth = 24;
  const audDepth = 30; 
  const audHeight = 12;

  return (
    <group>
      {/* === LOBBY AREA === */}
      <group position={[0, 0, 10]}>
         <pointLight position={[0, 7, 0]} intensity={1.5} distance={20} decay={2} />
         <pointLight position={[0, 7, 8]} intensity={1.5} distance={20} decay={2} />
         <pointLight position={[0, 7, -8]} intensity={1.5} distance={20} decay={2} />

         {/* Floor */}
         <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[lobbyWidth, lobbyDepth]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
         </mesh>

         {/* Ceiling */}
         <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, lobbyHeight, 0]}>
            <planeGeometry args={[lobbyWidth, lobbyDepth]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} />
         </mesh>

         {/* Side Walls */}
         <mesh rotation={[0, Math.PI / 2, 0]} position={[-lobbyWidth / 2, lobbyHeight / 2, 0]} receiveShadow>
            <planeGeometry args={[lobbyDepth, lobbyHeight]} />
            <meshStandardMaterial color="#ffffff" side={DoubleSide} />
         </mesh>
         <mesh rotation={[0, -Math.PI / 2, 0]} position={[lobbyWidth / 2, lobbyHeight / 2, 0]} receiveShadow>
            <planeGeometry args={[lobbyDepth, lobbyHeight]} />
            <meshStandardMaterial color="#ffffff" side={DoubleSide} />
         </mesh>
         
         {/* Back Wall (EXIT) - Open Frame */}
         <group position={[0, lobbyHeight / 2, lobbyDepth / 2]}>
            <mesh position={[0, 2.5, 0]}>
                <boxGeometry args={[lobbyWidth, 3, 1]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-5, -1.5, 0]}>
                <boxGeometry args={[6, 5, 1]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[5, -1.5, 0]}>
                <boxGeometry args={[6, 5, 1]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
         </group>

         {/* POSTERS */}
         <mesh name="Crimson Specter Poster" userData={{ type: 'poster' }} position={[-lobbyWidth / 2 + 0.1, 1.7, -4]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[2, 3]} />
            <meshStandardMaterial color="#900" emissive="#f00" emissiveIntensity={highlightedPoster === "Crimson Specter Poster" ? 1.0 : 0} />
         </mesh>
         <mesh name="Emerald Voyage Poster" userData={{ type: 'poster' }} position={[lobbyWidth / 2 - 0.1, 1.7, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[2, 3]} />
            <meshStandardMaterial color="#060" emissive="#0f0" emissiveIntensity={highlightedPoster === "Emerald Voyage Poster" ? 1.0 : 0} />
         </mesh>
         <mesh name="Azure Echo Poster" userData={{ type: 'poster' }} position={[-lobbyWidth / 2 + 0.1, 1.7, 4]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[2, 3]} />
            <meshStandardMaterial color="#006" emissive="#00f" emissiveIntensity={highlightedPoster === "Azure Echo Poster" ? 1.0 : 0} />
         </mesh>
      </group>

      {/* EXIT DOOR FRAME (Static part) */}
      <group position={[0, 0, 20]}>
         <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[4, 5, 0.3]} />
            <meshStandardMaterial color="#333" />
         </mesh>
         {/* Push Bars (Static) */}
         <mesh position={[-1, 2.5, 0.1]}>
             <boxGeometry args={[1.5, 0.1, 0.05]} />
             <meshStandardMaterial color="#ccc" />
         </mesh>
         <mesh position={[1, 2.5, 0.1]}>
             <boxGeometry args={[1.5, 0.1, 0.05]} />
             <meshStandardMaterial color="#ccc" />
         </mesh>
          {/* Glass/Open Panels (Static) */}
         <mesh position={[-1, 2.5, 0]}>
            <boxGeometry args={[1.8, 4.8, 0.1]} />
            <meshStandardMaterial color="#aaf" opacity={0.3} transparent />
         </mesh>
         <mesh position={[1, 2.5, 0]}>
            <boxGeometry args={[1.8, 4.8, 0.1]} />
            <meshStandardMaterial color="#aaf" opacity={0.3} transparent />
         </mesh>
      </group>

      {/* DIVIDER WALL */}
      <group position={[0, lobbyHeight / 2, 0]}>
          <mesh position={[-5, 0, 0]}>
             <boxGeometry args={[6, lobbyHeight, 0.5]} />
             <meshStandardMaterial color="#ffffff" /> 
          </mesh>
          <mesh position={[5, 0, 0]}>
             <boxGeometry args={[6, lobbyHeight, 0.5]} />
             <meshStandardMaterial color="#ffffff" /> 
          </mesh>
          <mesh position={[0, 3, 0]}>
             <boxGeometry args={[4, 2, 0.5]} />
             <meshStandardMaterial color="#ffffff" /> 
          </mesh>
      </group>

      {/* === OUTSIDE AREA === */}
      <group position={[0, 0, 30]}>
         <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#222222" roughness={0.9} />
         </mesh>
         
         <group position={[0, 0, 5]}>
             <mesh position={[0, 4, 0]}>
                 <boxGeometry args={[20, 8, 1]} />
                 <meshStandardMaterial color="#444444" roughness={0.8} />
             </mesh>
             <mesh position={[0, 2, -0.6]} >
                <boxGeometry args={[3, 4, 0.2]} />
                <meshStandardMaterial color="#333" />
             </mesh>
             <mesh position={[0, 2, -0.4]} >
                <boxGeometry args={[2.8, 3.8, 0.1]} />
                <meshStandardMaterial color="#555" metalness={0.9} roughness={0.2} />
             </mesh>
         </group>
         
         {/* Barricade */}
         <group position={[0, 0, 0]}>
            <mesh position={[0, 0.5, 0]}>
               <boxGeometry args={[8, 1, 0.2]} />
               <meshStandardMaterial color="#b00" />
            </mesh>
            <mesh position={[-3.5, 0.5, 0]}>
               <cylinderGeometry args={[0.1, 0.1, 1]} />
               <meshStandardMaterial color="#fff" />
            </mesh>
            <mesh position={[3.5, 0.5, 0]}>
               <cylinderGeometry args={[0.1, 0.1, 1]} />
               <meshStandardMaterial color="#fff" />
            </mesh>
         </group>
      </group>

      {/* === AUDITORIUM AREA === */}
      <group position={[0, 0, -audDepth / 2]}>
         <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[audWidth, audDepth]} />
            <meshStandardMaterial color="#222222" roughness={0.6} />
         </mesh>
         <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, audHeight, 0]}>
            <planeGeometry args={[audWidth, audDepth]} />
            <meshStandardMaterial color="#111111" />
         </mesh>
         <mesh position={[0, audHeight / 2, -audDepth / 2]}>
            <planeGeometry args={[audWidth, audHeight]} />
            <meshStandardMaterial color="#222222" />
         </mesh>
         <mesh rotation={[0, Math.PI / 2, 0]} position={[-audWidth / 2, audHeight / 2, 0]}>
            <planeGeometry args={[audDepth, audHeight]} />
            <meshStandardMaterial color="#222222" />
         </mesh>
         <mesh rotation={[0, -Math.PI / 2, 0]} position={[audWidth / 2, audHeight / 2, 0]}>
            <planeGeometry args={[audDepth, audHeight]} />
            <meshStandardMaterial color="#222222" />
         </mesh>

         {/* ETHEREAL CHANDELIER - Centered over audience's middle row */}
         <Suspense fallback={<pointLight position={[0, audHeight - 4, 7.5]} intensity={2} color="#fff4d6" />}>
            <group position={[0, audHeight - 4, 7.5]}>
                <Chandelier />
            </group>
         </Suspense>

         {/* Stage */}
         <group position={[0, 0, -10]}>
            <mesh position={[0, 0.5, 0]} receiveShadow>
               <boxGeometry args={[16, 1, 6]} />
               <meshStandardMaterial color="#441111" />
            </mesh>
            <spotLight 
               position={[0, 15, 10]} 
               target-position={[0, 0, 0]}
               angle={0.4} 
               penumbra={0.5} 
               intensity={200} 
               color="#ffffff" 
               castShadow 
            />
         </group>

         {/* Chairs */}
         <group position={[0, 0, 5]}>
            {[0, 1, 2].map((row) => 
               [-4, -2, 0, 2, 4].map((col) => (
               <mesh 
                  key={`Chair-${row}-${col}`} 
                  name={`Chair-${row}-${col}`}
                  userData={{ type: 'chair', sittingPos: [col * 1.5, 1.4, -10 + row * 2.5] }}
                  position={[col * 1.5, 0.4, row * 2.5]} 
                  castShadow
               >
                  <boxGeometry args={[0.8, 0.8, 0.8]} />
                  <meshStandardMaterial color="#550000" roughness={0.4} />
               </mesh>
               ))
            )}
         </group>
      </group>
    </group>
  );
};

// --- 2. DOORS (Dynamic Geometry: Open/Close Animations) ---
const SceneDoors: React.FC<{ isOpen?: boolean }> = ({ isOpen }) => {
  const leftDoorRef = useRef<Mesh>(null);
  const rightDoorRef = useRef<Mesh>(null);

  useFrame(() => {
    if (leftDoorRef.current && rightDoorRef.current) {
      const targetPos = isOpen ? 2.5 : 1;
      leftDoorRef.current.position.x += ((-targetPos) - leftDoorRef.current.position.x) * 0.1;
      rightDoorRef.current.position.x += (targetPos - rightDoorRef.current.position.x) * 0.1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
       <mesh ref={leftDoorRef} position={[-1, 4, 0]}>
          <boxGeometry args={[2, 8, 0.2]} />
          <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
       </mesh>
       <mesh ref={rightDoorRef} position={[1, 4, 0]}>
          <boxGeometry args={[2, 8, 0.2]} />
          <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
       </mesh>
    </group>
  );
};

// --- 3. CHARACTERS (Dynamic Geometry: Walking, Gestures) ---
const SceneCharacters: React.FC<{ performerArrived?: boolean, isNearStageDoor?: boolean }> = ({ performerArrived, isNearStageDoor }) => {
  const performerRef = useRef<Group>(null);
  const lobbyPerformerRef = useRef<Group>(null);
  const flashGroupRef = useRef<Group>(null);

  useFrame((state, delta) => {
    // Auditorium Performer Animation
    if (performerRef.current) {
      const time = state.clock.elapsedTime;
      performerRef.current.position.x = Math.sin(time) * 5; 
      const targetRotation = Math.cos(time) > 0 ? Math.PI / 2 : -Math.PI / 2;
      performerRef.current.rotation.y += (targetRotation - performerRef.current.rotation.y) * 0.1;
    }

    // Lobby Performer Animation
    if (lobbyPerformerRef.current && performerArrived) {
       const targetZ = 31.0; 
       if (lobbyPerformerRef.current.position.z > targetZ) {
          lobbyPerformerRef.current.position.z -= delta * 1.5; 
          lobbyPerformerRef.current.position.y = Math.sin(state.clock.elapsedTime * 10) * 0.05;
       } else {
          lobbyPerformerRef.current.position.z = targetZ;
          lobbyPerformerRef.current.position.y = 0;
       }
    }

    // Flash Animation
    if (flashGroupRef.current && isNearStageDoor) {
       flashGroupRef.current.visible = Math.random() > 0.90;
    } else if (flashGroupRef.current) {
       flashGroupRef.current.visible = false;
    }
  });

  return (
    <group>
      {/* USHER */}
      <group position={[3, 1.5, 2]}>
         <mesh userData={{ type: 'usher' }}>
            <capsuleGeometry args={[0.4, 1.8, 4, 8]} />
            <meshStandardMaterial color="#333" />
         </mesh>
         <mesh position={[0, 1.4, 0]}>
            <sphereGeometry args={[0.25]} />
            <meshStandardMaterial color="#eec" />
         </mesh>
         <mesh position={[0, 0.5, 0.26]}>
            <boxGeometry args={[0.3, 0.6, 0.1]} />
            <meshStandardMaterial color="#800" />
         </mesh>
      </group>

      {/* CROWD */}
      <group position={[0, 0, 29]}> 
         {[-2, -3, 2, 3].map((x, i) => (
             <group key={i} position={[x, 0, 0]}>
                <mesh>
                   <capsuleGeometry args={[0.3, 1.6, 4, 8]} />
                   <meshStandardMaterial color={['#444', '#555', '#333'][i%3]} />
                </mesh>
                <mesh position={[0, 1.3, 0]}>
                   <sphereGeometry args={[0.2]} />
                   <meshStandardMaterial color="#dcb" />
                </mesh>
             </group>
         ))}
      </group>

      {/* LOBBY PERFORMER (Starts at Z=35) */}
      <group ref={lobbyPerformerRef} position={[0, 0, 35]} visible={performerArrived}>
         <mesh userData={{ type: 'performer' }}>
             <capsuleGeometry args={[0.35, 1.7, 4, 8]} />
             <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
         </mesh>
         <mesh position={[0, 1.4, 0.25]}>
            <boxGeometry args={[0.3, 0.1, 0.1]} />
            <meshStandardMaterial color="#000" />
         </mesh>
      </group>

      {/* AUDITORIUM PERFORMER */}
      <group ref={performerRef} position={[0, 2, -25]}>
         <mesh castShadow>
            <cylinderGeometry args={[0.4, 0.5, 2, 16]} />
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.8} />
         </mesh>
         <pointLight intensity={5} color="#fff" distance={8} />
      </group>

      {/* FLASHES */}
      <group ref={flashGroupRef} position={[0, 2, 28]} visible={false}>
         <pointLight position={[-2, 0, 0]} intensity={20} distance={10} color="#fff" />
         <pointLight position={[2, 0.5, 0]} intensity={20} distance={10} color="#aaf" />
      </group>
    </group>
  );
};


// --- MAIN COMPONENT ---
const Lobby: React.FC<LobbyProps> = ({ 
  highlightedPoster, 
  auditoriumDoorOpen,
  performerArrived,
  isNearStageDoor 
}) => {
  return (
    <group>
      <SceneEnvironment highlightedPoster={highlightedPoster} />
      <SceneDoors isOpen={auditoriumDoorOpen} />
      <SceneCharacters 
        performerArrived={performerArrived} 
        isNearStageDoor={isNearStageDoor} 
      />
    </group>
  );
};

export default Lobby;
