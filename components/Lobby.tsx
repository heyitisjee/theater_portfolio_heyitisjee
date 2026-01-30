
import React, { useRef, Suspense, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Object3D, PointLight } from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

interface LobbyProps {
  highlightedPoster?: string | null;
  auditoriumDoorOpen?: boolean;
  lobbyDoorOpen?: boolean;
  performerArrived?: boolean;
  stagePerformerIndex?: number;
  isNearStageDoor?: boolean;
  chandelierPos?: [number, number, number];
  chandelierIntensity?: number;
  chandelierScale?: number;
  isHoveringUsher?: boolean;
}

const USHER_MODEL_URL = 'https://raw.githubusercontent.com/heyitisjee/theater-assets/bd44fe10a9cfa22b5d8935e6b77d2484a0f561dd/talking-v2.glb';

const StaticUsher: React.FC<{ isHovering: boolean }> = ({ isHovering }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(USHER_MODEL_URL);
  const { actions } = useAnimations(animations, groupRef);

  // Hardcoded values based on previous best positioning
  const position: [number, number, number] = [4.2, 0.0, 2.0];
  const rotation: [number, number, number] = [0, -0.8, 0];
  const scale = 1.4; // Scaled up by 0.1 from 1.3

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          child.material.side = THREE.FrontSide;
          child.material.transparent = false;
          child.material.depthWrite = true;
          child.material.depthTest = true;
          child.material.needsUpdate = true;
        }
      }
    });

    if (actions && Object.keys(actions).length > 0) {
      const actionName = Object.keys(actions)[0];
      const action = actions[actionName];
      if (action) {
        action.reset().fadeIn(0.5).play();
        action.setEffectiveTimeScale(1.0); 
      }
    }
  }, [actions, scene]);

  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={rotation}
      scale={[scale, scale, scale]} 
      userData={{ type: 'usher' }}
    >
      <primitive object={scene} />
    </group>
  );
};

const StageModel: React.FC = () => {
  const { scene } = useGLTF('https://raw.githubusercontent.com/heyitisjee/theater-assets/5b0219c9783e687cfe75d19f05ca43ff9496bb9b/staged-v1.glb');
  
  useEffect(() => {
    scene.traverse((child: Object3D) => {
      if (child.name.toLowerCase().includes('light') || child.name.toLowerCase().includes('chandelier')) {
        child.visible = false;
      }
    });
  }, [scene]);

  return (
    <primitive 
      object={scene} 
      name="StageModel" 
      position={[0, 0, -6.5]} 
      rotation={[0, -1.5708, 0]} 
      scale={[0.7, 0.7, 0.7]} 
    />
  );
};

const StagePerformer: React.FC<{ index: number }> = ({ index }) => {
  const models = [
    'https://raw.githubusercontent.com/heyitisjee/theater-assets/8618c9db567f0136c585c15f14451496f3c03ea1/dancing1-v1.glb',
    'https://raw.githubusercontent.com/heyitisjee/theater-assets/2a1b1d9ea924eec7f9c28887e328da6dfd12c557/dancing2-v1.glb',
    'https://raw.githubusercontent.com/heyitisjee/theater-assets/3547a04c965c22634c51f364b6639c915ba3184a/oldman-v3.glb'
  ];
  
  const { scene, animations } = useGLTF(models[index]);
  const { actions } = useAnimations(animations, scene);
  
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const firstAction = actions[Object.keys(actions)[0]];
      firstAction?.reset().fadeIn(0.5).play();
      return () => { firstAction?.fadeOut(0.5); };
    }
  }, [actions, index]);

  return (
    <primitive 
      object={scene} 
      position={[0.8, 6.0, -10.5]} 
      rotation={[0, 0, 0]}
      scale={[2.0, 2.0, 2.0]} 
    />
  );
};

const PaparazziFlash: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const lightRef = useRef<PointLight>(null);
  const flashIntensity = useRef(0);

  useFrame(() => {
    if (!lightRef.current) return;
    if (Math.random() > 0.995) { 
      flashIntensity.current = 15;
    } else {
      flashIntensity.current *= 0.8;
    }
    lightRef.current.intensity = flashIntensity.current;
  });

  return <pointLight ref={lightRef} position={position} color="#ffffff" distance={8} />;
};

const Performer: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const targetZ = 4.0; 
  const startZ = 15.0; 

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.02);
      const walkProgress = Math.abs(groupRef.current.position.z - targetZ);
      if (walkProgress > 0.1) {
         groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 6) * 0.08;
      } else {
         groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, 0.1);
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, startZ]}>
       <mesh position={[0, 1.2, 0]} userData={{ type: 'performer' }}>
          <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3} />
       </mesh>
    </group>
  );
};

const Chandelier: React.FC<{ position: [number, number, number], scale: number }> = ({ position, scale }) => {
  const LIGHT_MODEL_URL = 'https://raw.githubusercontent.com/heyitisjee/theater-assets/2a1b1d9ea924eec7f9c28887e328da6dfd12c557/light-v1%20(2).glb';
  const { scene } = useGLTF(LIGHT_MODEL_URL);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          if (child.material) {
            // We only set DoubleSide to ensure internal structures aren't invisible
            child.material.side = THREE.DoubleSide;
            
            if (child.material instanceof THREE.MeshStandardMaterial) {
              // DRASTICALLY reduced to 0.02 to allow textures to show.
              // We no longer force the emissive color to pure white.
              child.material.emissiveIntensity = 0.02;
              child.material.needsUpdate = true;
            }
          }
        }
      });
    }
  }, [scene]);

  return (
    <group position={position} scale={[scale, scale, scale]}>
      <primitive object={scene} />
      {/* Point light in the center provides scene illumination without washing out the model */}
      <pointLight 
        position={[0, 0, 0]} 
        intensity={80} 
        distance={25} 
        color="#ffffff" 
        castShadow 
      />
    </group>
  );
};

const TheaterSeat: React.FC<{ position: [number, number, number], name: string }> = ({ position, name }) => {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]} rotation={[0, Math.PI, 0]}>
      <mesh name={name} userData={{ type: 'chair' }} position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.9, 0.15, 0.8]} />
        <meshStandardMaterial color="#800000" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.8, -0.35]} castShadow>
        <boxGeometry args={[0.9, 0.9, 0.1]} />
        <meshStandardMaterial color="#800000" roughness={0.4} />
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

const AuditoriumWallLight: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh castShadow>
      <boxGeometry args={[0.1, 0.5, 0.2]} />
      <meshStandardMaterial color="#222" />
    </mesh>
    <mesh position={[position[0] > 0 ? -0.08 : 0.08, 0, 0]}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial color="#ffaa44" emissive="#ffaa44" emissiveIntensity={3} />
    </mesh>
    <pointLight intensity={8} distance={10} color="#ffcc88" decay={2} />
  </group>
);

const Lobby: React.FC<LobbyProps> = ({ 
  highlightedPoster, 
  auditoriumDoorOpen, 
  lobbyDoorOpen, 
  performerArrived,
  stagePerformerIndex = 0,
  chandelierPos = [0, -1.2, 7.8], 
  chandelierScale = 0.5,
  isHoveringUsher = false
}) => {
  const lobbyWidth = 16;
  const lobbyHeight = 8;
  const lobbyDepth = 15; 

  const leftAudDoorRef = useRef<THREE.Group>(null);
  const rightAudDoorRef = useRef<THREE.Group>(null);
  const leftLobbyDoorRef = useRef<THREE.Group>(null);
  const rightLobbyDoorRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (leftAudDoorRef.current && rightAudDoorRef.current) {
      const targetRot = auditoriumDoorOpen ? -Math.PI / 1.6 : 0;
      leftAudDoorRef.current.rotation.y += (targetRot - leftAudDoorRef.current.rotation.y) * 0.1;
      rightAudDoorRef.current.rotation.y += (-targetRot - rightAudDoorRef.current.rotation.y) * 0.1;
    }
    if (leftLobbyDoorRef.current && rightLobbyDoorRef.current) {
      const targetRot = lobbyDoorOpen ? Math.PI / 1.6 : 0;
      leftLobbyDoorRef.current.rotation.y += (targetRot - leftLobbyDoorRef.current.rotation.y) * 0.1;
      rightLobbyDoorRef.current.rotation.y += (-targetRot - rightLobbyDoorRef.current.rotation.y) * 0.1;
    }
  });

  return (
    <group>
      <hemisphereLight intensity={0.4} groundColor="#000" color="#ffffff" />
      
      <group position={[0, 0, lobbyDepth / 2]}>
         <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[lobbyWidth, lobbyDepth]} />
            <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0.05} />
         </mesh>
         <mesh position={[-lobbyWidth/2, lobbyHeight/2, 0]} rotation={[0, Math.PI/2, 0]}>
            <planeGeometry args={[lobbyDepth, lobbyHeight]} />
            <meshStandardMaterial color="#ffffff" side={DoubleSide} />
         </mesh>
         <mesh position={[lobbyWidth/2, lobbyHeight/2, 0]} rotation={[0, -Math.PI/2, 0]}>
            <planeGeometry args={[lobbyDepth, lobbyHeight]} />
            <meshStandardMaterial color="#ffffff" side={DoubleSide} />
         </mesh>
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

      <group position={[0, lobbyHeight / 2, 15]}>
          <mesh position={[-5, 0, 0]}><boxGeometry args={[6, lobbyHeight, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[5, 0, 0]}><boxGeometry args={[6, lobbyHeight, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0, 2, 0]}><boxGeometry args={[4, 4, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
      </group>
      <group position={[0, lobbyHeight / 2, 0]}>
          <mesh position={[-5, 0, 0]}><boxGeometry args={[6, lobbyHeight, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[5, 0, 0]}><boxGeometry args={[6, lobbyHeight, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0, 2, 0]}><boxGeometry args={[4, 4, 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
      </group>

      <mesh position={[0, lobbyHeight, lobbyDepth/2]} rotation={[Math.PI/2, 0, 0]}>
         <planeGeometry args={[lobbyWidth, lobbyDepth]} />
         <meshStandardMaterial color="#ffffff" />
      </mesh>

      <group position={[2, 0, 0]} ref={rightAudDoorRef}>
        <mesh position={[-1.05, 2, 0]}><boxGeometry args={[2.1, 4, 0.2]} /><meshStandardMaterial color="#400" /></mesh>
      </group>
      <group position={[-2, 0, 0]} ref={leftAudDoorRef}>
        <mesh position={[1.05, 2, 0]}><boxGeometry args={[2.1, 4, 0.2]} /><meshStandardMaterial color="#400" /></mesh>
      </group>
      <group position={[2, 0, 15]} ref={rightLobbyDoorRef}>
        <mesh position={[-1.05, 2, 0]}><boxGeometry args={[2.1, 4, 0.2]} /><meshStandardMaterial color="#eee" /></mesh>
      </group>
      <group position={[-2, 0, 15]} ref={leftLobbyDoorRef}>
        <mesh position={[1.05, 2, 0]}><boxGeometry args={[2.1, 4, 0.2]} /><meshStandardMaterial color="#eee" /></mesh>
      </group>

      <group position={[0, 0, -12.5]}>
         <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[lobbyWidth, 25]} />
            <meshStandardMaterial color="#050505" />
         </mesh>
         
         {[-8, -4, 0, 4, 8].map((zPos) => (
           <React.Fragment key={`aud-side-lights-${zPos}`}>
             <AuditoriumWallLight position={[-7.9, 3, zPos]} />
             <AuditoriumWallLight position={[7.9, 3, zPos]} />
           </React.Fragment>
         ))}

         <group position={[0, 0, 8]}> 
            {[0, 1, 2].map((row) => {
               const riserHeight = (2 - row) * 0.4;
               const zOffset = row * -2.4; 
               return (
                 <group key={`row-group-${row}`}>
                   <mesh position={[0, riserHeight / 2, zOffset]} receiveShadow>
                      <boxGeometry args={[12, riserHeight + 0.05, 2.4]} />
                      <meshStandardMaterial color="#020202" />
                   </mesh>
                   {[-3, -1.5, 0, 1.5, 3].map((col) => (
                     <TheaterSeat key={`Chair-${row}-${col}`} name={`Chair-${row}-${col}`} position={[col, riserHeight, zOffset]} />
                   ))}
                 </group>
               );
            })}
         </group>
         <Suspense fallback={null}>
            <StageModel />
            <spotLight position={[0, 10, -10.5]} intensity={15} angle={0.6} penumbra={1} color="#ffffff" />
            <StagePerformer index={stagePerformerIndex} />
         </Suspense>
      </group>

      <Suspense fallback={null}>
        <Chandelier position={chandelierPos} scale={chandelierScale} />
      </Suspense>

      <Suspense fallback={null}>
        <StaticUsher isHovering={isHoveringUsher} />
      </Suspense>

      <group position={[0, 0, 15]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 7.5]}>
            <planeGeometry args={[20, 15]} />
            <meshStandardMaterial color="#020202" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 7.5]}>
            <planeGeometry args={[3.0, 15]} />
            <meshStandardMaterial color="#700" />
          </mesh>
          <group position={[2.5, 0, 7.5]}>
             <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.2, 1, 15]} /><meshStandardMaterial color="#222" /></mesh>
             <mesh position={[0, 1, 0]}><boxGeometry args={[0.1, 0.1, 15]} /><meshStandardMaterial color="#bbb" metalness={1} roughness={0.1} /></mesh>
          </group>
          <group position={[-2.5, 0, 7.5]}>
             <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.2, 1, 15]} /><meshStandardMaterial color="#222" /></mesh>
             <mesh position={[0, 1, 0]}><boxGeometry args={[0.1, 0.1, 15]} /><meshStandardMaterial color="#bbb" metalness={1} roughness={0.1} /></mesh>
          </group>
          <pointLight position={[0, 7, 5]} intensity={2.0} distance={30} color="#ffffff" />
          <group position={[0, 0, 0]}>
             {[...Array(6)].map((_, i) => (
                <group key={`fan-l-${i}`} position={[-4.5 + Math.random() * -1, 0, 5 + i * 2]}>
                   <mesh position={[0, 1, 0]}><boxGeometry args={[0.5, 2, 0.5]} /><meshStandardMaterial color={`hsl(${Math.random() * 360}, 30%, 20%)`} /></mesh>
                   <PaparazziFlash position={[0, 1.8, 0.2]} />
                </group>
             ))}
             {[...Array(6)].map((_, i) => (
                <group key={`fan-r-${i}`} position={[4.5 + Math.random() * 1, 0, 5 + i * 2]}>
                   <mesh position={[0, 1, 0]}><boxGeometry args={[0.5, 2, 0.5]} /><meshStandardMaterial color={`hsl(${Math.random() * 360}, 30%, 20%)`} /></mesh>
                   <PaparazziFlash position={[0, 1.8, -0.2]} />
                </group>
             ))}
          </group>
          
          {performerArrived && (
            <group visible={lobbyDoorOpen}>
               <Performer />
            </group>
          )}
      </group>
    </group>
  );
};

export default Lobby;
