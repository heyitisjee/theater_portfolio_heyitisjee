
import React, { useRef, Suspense, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Object3D } from 'three';
import { useGLTF, useAnimations, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface LobbyProps {
  highlightedPoster?: string | null;
  auditoriumDoorOpen?: boolean;
  lobbyDoorOpen?: boolean;
  performerArrived?: boolean;
  stagePerformerIndex?: number;
  isPerformerSigning?: boolean;
  isNearStageDoor?: boolean;
  chandelierPos?: [number, number, number];
  chandelierIntensity?: number;
  chandelierScale?: number;
}

const USHER_MODEL_URL = 'https://raw.githubusercontent.com/heyitisjee/theater-assets/bd44fe10a9cfa22b5d8935e6b77d2484a0f561dd/talking-v2.glb';

const Usher: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(USHER_MODEL_URL);
  const { actions } = useAnimations(animations, groupRef);

  const position: [number, number, number] = [4.2, 0.0, 2.0];
  const rotation: [number, number, number] = [0, -0.8, 0];
  const scale = 1.4;

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
      const activeAction = actions[Object.keys(actions)[0]];
      if (activeAction) {
        activeAction.reset().fadeIn(0.5).play();
        activeAction.setEffectiveTimeScale(1.0);
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
  const lightRef = useRef<THREE.PointLight>(null);
  const flashIntensity = useRef(0);

  useFrame(() => {
    if (!lightRef.current) return;
    if (Math.random() > 0.99) { 
      flashIntensity.current = 18;
    } else {
      flashIntensity.current *= 0.85;
    }
    lightRef.current.intensity = flashIntensity.current;
  });

  return <pointLight ref={lightRef} position={position} color="#ffffff" distance={8} />;
};

const Performer: React.FC<{ isSigning: boolean }> = ({ isSigning }) => {
  const groupRef = useRef<THREE.Group>(null);
  const targetZ = 3.0; 
  const startZ = 12.0; 

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.015);
      
      const walkProgress = Math.abs(groupRef.current.position.z - targetZ);
      if (walkProgress > 0.05) {
         groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 6) * 0.08 + 1.2;
      } else {
         groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 1.2, 0.1);
      }

      if (isSigning) {
        groupRef.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1);
      } else {
        groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 1.2, startZ]} userData={{ type: 'performer' }}>
       <mesh castShadow>
          <boxGeometry args={[0.8, 2.4, 0.5]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
       </mesh>
       <mesh position={[0, 1.6, 0.3]}>
          <boxGeometry args={[0.4, 0.4, 0.2]} />
          <meshStandardMaterial color="#222" />
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
            child.material.side = THREE.DoubleSide;
            if (child.material instanceof THREE.MeshStandardMaterial) {
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

const PosterWithLight: React.FC<{ 
  position: [number, number, number], 
  rotation: [number, number, number], 
  texture: THREE.Texture, 
  name: string, 
  highlighted: boolean 
}> = ({ position, rotation, texture, name, highlighted }) => {
  return (
    <group position={position} rotation={rotation}>
      <spotLight 
        position={[0, 2.5, 1.5]} 
        target-position={[0, 0, 0]} 
        intensity={12} 
        angle={0.35} 
        penumbra={0.6} 
        color="#fff4e0" 
      />
      <mesh name={name} userData={{ type: 'poster' }}>
        <planeGeometry args={[2, 3]} />
        <meshStandardMaterial 
          map={texture} 
          emissive="#ffffff" 
          emissiveMap={texture} 
          emissiveIntensity={highlighted ? 1.0 : 0.08} 
        />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[2.2, 3.2, 0.08]} />
        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

const TheaterSeat: React.FC<{ position: [number, number, number], name: string }> = ({ position, name }) => {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]} rotation={[0, Math.PI, 0]}>
      <mesh name={name} userData={{ type: 'chair' }} position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.9, 0.15, 0.8]} />
        <meshStandardMaterial color="#600000" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.8, -0.35]} castShadow>
        <boxGeometry args={[0.9, 0.9, 0.1]} />
        <meshStandardMaterial color="#600000" roughness={0.4} />
      </mesh>
      <mesh position={[-0.48, 0.55, 0]} castShadow>
        <boxGeometry args={[0.08, 0.1, 0.6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.48, 0.55, 0]} castShadow>
        <boxGeometry args={[0.08, 0.1, 0.6]} />
        <meshStandardMaterial color="#111" />
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

const Stanchion: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh castShadow position={[0, 0.02, 0]}>
      <cylinderGeometry args={[0.18, 0.18, 0.05, 16]} />
      <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
    </mesh>
    <mesh castShadow position={[0, 0.6, 0]}>
      <cylinderGeometry args={[0.035, 0.035, 1.2, 16]} />
      <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
    </mesh>
    <mesh castShadow position={[0, 1.2, 0]}>
      <sphereGeometry args={[0.07, 16, 16]} />
      <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
    </mesh>
  </group>
);

const VelvetRope: React.FC<{ start: [number, number, number], end: [number, number, number] }> = ({ start, end }) => {
  const [x1, y1, z1] = start;
  const [x2, y2, z2] = end;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 - 0.25; 
  const midZ = (z1 + z2) / 2;
  
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(x1, y1 + 1.1, z1),
    new THREE.Vector3(midX, midY + 1.1, midZ),
    new THREE.Vector3(x2, y2 + 1.1, z2)
  );

  return (
    <mesh>
      <tubeGeometry args={[curve, 32, 0.03, 12, false]} />
      <meshStandardMaterial color="#900000" roughness={0.7} />
    </mesh>
  );
};

const SteelBarricade: React.FC<{ position: [number, number, number], rotation?: [number, number, number] }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    {/* Frame */}
    <mesh position={[0, 1.1, 0]} castShadow>
      <boxGeometry args={[2.0, 0.06, 0.06]} />
      <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, 0.4, 0]} castShadow>
      <boxGeometry args={[2.0, 0.04, 0.04]} />
      <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
    </mesh>
    {/* Verticals */}
    {[-0.95, -0.65, -0.35, -0.05, 0.25, 0.55, 0.85].map((x, i) => (
      <mesh key={i} position={[x, 0.7, 0]} castShadow>
        <boxGeometry args={[0.03, 0.8, 0.03]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
    ))}
    {/* End Posts */}
    <mesh position={[-1, 0.55, 0]} castShadow>
      <boxGeometry args={[0.07, 1.1, 0.07]} />
      <meshStandardMaterial color="#777" metalness={0.9} roughness={0.1} />
    </mesh>
    <mesh position={[1, 0.55, 0]} castShadow>
      <boxGeometry args={[0.07, 1.1, 0.07]} />
      <meshStandardMaterial color="#777" metalness={0.9} roughness={0.1} />
    </mesh>
    {/* Feet */}
    <mesh position={[-1, 0.02, 0]} castShadow>
      <boxGeometry args={[0.1, 0.04, 0.6]} />
      <meshStandardMaterial color="#444" metalness={0.6} />
    </mesh>
    <mesh position={[1, 0.02, 0]} castShadow>
      <boxGeometry args={[0.1, 0.04, 0.6]} />
      <meshStandardMaterial color="#444" metalness={0.6} />
    </mesh>
  </group>
);

const Lobby: React.FC<LobbyProps> = ({ 
  highlightedPoster, 
  auditoriumDoorOpen, 
  lobbyDoorOpen, 
  performerArrived,
  stagePerformerIndex = 0,
  isPerformerSigning = false,
  chandelierPos = [0, -1.2, 7.8], 
  chandelierScale = 0.5
}) => {
  const lobbyWidth = 16;
  const lobbyHeight = 8;
  const lobbyDepth = 15; 

  const leftAudDoorRef = useRef<THREE.Group>(null);
  const rightAudDoorRef = useRef<THREE.Group>(null);
  const leftLobbyDoorRef = useRef<THREE.Group>(null);
  const rightLobbyDoorRef = useRef<THREE.Group>(null);

  const posterTextures = useTexture([
    "https://raw.githubusercontent.com/heyitisjee/theater-assets/b1960f5ef0a3ec18401b799b50491f642393eb17/poster1.png",
    "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/poster2.png",
    "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/poster3.png",
    "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/poster4.png",
    "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/poster5.png",
    "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/poster6.png"
  ]);

  useFrame(() => {
    if (leftAudDoorRef.current && rightAudDoorRef.current) {
      const targetRot = auditoriumDoorOpen ? -Math.PI / 1.6 : 0;
      const audSpeed = auditoriumDoorOpen ? 0.1 : 0.035; 
      leftAudDoorRef.current.rotation.y += (targetRot - leftAudDoorRef.current.rotation.y) * audSpeed;
      rightAudDoorRef.current.rotation.y += (-targetRot - rightAudDoorRef.current.rotation.y) * audSpeed;
    }
    if (leftLobbyDoorRef.current && rightLobbyDoorRef.current) {
      const targetRot = lobbyDoorOpen ? Math.PI / 1.6 : 0;
      const lobSpeed = lobbyDoorOpen ? 0.1 : 0.05;
      leftLobbyDoorRef.current.rotation.y += (targetRot - leftLobbyDoorRef.current.rotation.y) * lobSpeed;
      rightLobbyDoorRef.current.rotation.y += (-targetRot - rightLobbyDoorRef.current.rotation.y) * lobSpeed;
    }
  });

  const posterY = 3.0;

  const WallMaterial = () => <meshStandardMaterial color="#fdfcf0" roughness={0.35} metalness={0.05} side={DoubleSide} />;
  
  // Updated DoorMaterial: lower metalness and higher roughness per user request
  const DoorMaterial = () => <meshStandardMaterial color="#1a0401" roughness={0.8} metalness={0.02} />;

  const stanchionPositions = [-7, -5, -3, -1, 1, 3, 5, 7];
  const externalBarricadePositions = [1, 3, 5, 7, 9, 11, 13];

  return (
    <group>
      <hemisphereLight intensity={0.65} groundColor="#111" color="#ffffff" />
      
      <group position={[0, 0, lobbyDepth / 2]}>
         {/* Lobby Floor */}
         <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[lobbyWidth, lobbyDepth]} />
            <meshStandardMaterial color="#f0f0f0" roughness={0.04} metalness={0.1} />
         </mesh>

         {/* Broadway Red Carpet */}
         <mesh position={[0, 0.015, 0.05]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[3.2, 14.9]} />
            <meshStandardMaterial color="#8b0000" roughness={0.8} />
         </mesh>

         {/* Stanchions and Ropes - Internal Lobby */}
         {stanchionPositions.map((z, i) => (
           <React.Fragment key={`stanchion-pair-${i}`}>
              <Stanchion position={[1.8, 0, z]} />
              <Stanchion position={[-1.8, 0, z]} />
              {i < stanchionPositions.length - 1 && (
                <>
                  <VelvetRope start={[1.8, 0, z]} end={[1.8, 0, stanchionPositions[i+1]]} />
                  <VelvetRope start={[-1.8, 0, z]} end={[-1.8, 0, stanchionPositions[i+1]]} />
                </>
              )}
           </React.Fragment>
         ))}

         {/* Walls */}
         <mesh position={[-lobbyWidth/2, lobbyHeight/2, 0]} rotation={[0, Math.PI/2, 0]}>
            <planeGeometry args={[lobbyDepth, lobbyHeight]} />
            <WallMaterial />
         </mesh>
         <mesh position={[lobbyWidth/2, lobbyHeight/2, 0]} rotation={[0, -Math.PI/2, 0]}>
            <planeGeometry args={[lobbyDepth, lobbyHeight]} />
            <WallMaterial />
         </mesh>

         {/* Posters */}
         <PosterWithLight 
            name="First Filter Poster" 
            position={[-lobbyWidth / 2 + 0.12, posterY, -4.5]} 
            rotation={[0, Math.PI / 2, 0]} 
            texture={posterTextures[0]} 
            highlighted={highlightedPoster === "First Filter Poster"} 
         />
         <PosterWithLight 
            name="Korean Theater Poster 1" 
            position={[-lobbyWidth / 2 + 0.12, posterY, 0]} 
            rotation={[0, Math.PI / 2, 0]} 
            texture={posterTextures[1]} 
            highlighted={highlightedPoster === "Korean Theater Poster 1"} 
         />
         <PosterWithLight 
            name="Korean Theater Poster 2" 
            position={[-lobbyWidth / 2 + 0.12, posterY, 4.5]} 
            rotation={[0, Math.PI / 2, 0]} 
            texture={posterTextures[2]} 
            highlighted={highlightedPoster === "Korean Theater Poster 2"} 
         />

         <PosterWithLight 
            name="Theater Club Promotion Poster" 
            position={[lobbyWidth / 2 - 0.12, posterY, -4.5]} 
            rotation={[0, -Math.PI / 2, 0]} 
            texture={posterTextures[3]} 
            highlighted={highlightedPoster === "Theater Club Promotion Poster"} 
         />
         <PosterWithLight 
            name="Broadway Playbill Poster" 
            position={[lobbyWidth / 2 - 0.12, posterY, 0]} 
            rotation={[0, -Math.PI / 2, 0]} 
            texture={posterTextures[4]} 
            highlighted={highlightedPoster === "Broadway Playbill Poster"} 
         />
         <PosterWithLight 
            name="Theater & AR Portfolio poster" 
            position={[lobbyWidth / 2 - 0.12, posterY, 4.5]} 
            rotation={[0, -Math.PI / 2, 0]} 
            texture={posterTextures[5]} 
            highlighted={highlightedPoster === "Theater & AR Portfolio poster"} 
         />
      </group>

      {/* Entrance and Auditorium Walls */}
      <group position={[0, lobbyHeight / 2, 15]}>
          <mesh position={[-5, 0, 0]}><boxGeometry args={[6, lobbyHeight, 0.5]} /><WallMaterial /></mesh>
          <mesh position={[5, 0, 0]}><boxGeometry args={[6, lobbyHeight, 0.5]} /><WallMaterial /></mesh>
          <mesh position={[0, 2, 0]}><boxGeometry args={[4, 4, 0.5]} /><WallMaterial /></mesh>
      </group>
      <group position={[0, lobbyHeight / 2, 0]}>
          <mesh position={[-5, 0, 0]}><boxGeometry args={[6, lobbyHeight, 0.5]} /><WallMaterial /></mesh>
          <mesh position={[5, 0, 0]}><boxGeometry args={[6, lobbyHeight, 0.5]} /><WallMaterial /></mesh>
          <mesh position={[0, 2, 0]}><boxGeometry args={[4, 4, 0.5]} /><WallMaterial /></mesh>
      </group>

      <mesh position={[0, lobbyHeight, lobbyDepth/2]} rotation={[Math.PI/2, 0, 0]}>
         <planeGeometry args={[lobbyWidth, lobbyDepth]} />
         <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Doors */}
      <group position={[2, 0, 0]} ref={rightAudDoorRef}>
        <mesh position={[-1.05, 2, 0]}><boxGeometry args={[2.1, 4, 0.2]} /><DoorMaterial /></mesh>
        <mesh position={[-1.8, 2, 0.12]}><sphereGeometry args={[0.08, 16, 16]} /><meshStandardMaterial color="#ffd700" metalness={1} /></mesh>
      </group>
      <group position={[-2, 0, 0]} ref={leftAudDoorRef}>
        <mesh position={[1.05, 2, 0]}><boxGeometry args={[2.1, 4, 0.2]} /><DoorMaterial /></mesh>
        <mesh position={[1.8, 2, 0.12]}><sphereGeometry args={[0.08, 16, 16]} /><meshStandardMaterial color="#ffd700" metalness={1} /></mesh>
      </group>

      <group position={[2, 0, 15]} ref={rightLobbyDoorRef}>
        <mesh position={[-1.05, 2, 0]}><boxGeometry args={[2.1, 4, 0.2]} /><DoorMaterial /></mesh>
        <mesh position={[-1.8, 2, -0.12]}><sphereGeometry args={[0.08, 16, 16]} /><meshStandardMaterial color="#ffd700" metalness={1} /></mesh>
      </group>
      <group position={[-2, 0, 15]} ref={leftLobbyDoorRef}>
        <mesh position={[1.05, 2, 0]}><boxGeometry args={[2.1, 4, 0.2]} /><DoorMaterial /></mesh>
        <mesh position={[1.8, 2, -0.12]}><sphereGeometry args={[0.08, 16, 16]} /><meshStandardMaterial color="#ffd700" metalness={1} /></mesh>
      </group>

      {/* Auditorium Area */}
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
            <spotLight position={[0, 12, -10.5]} intensity={18} angle={0.55} penumbra={1} color="#ffffff" />
            <StagePerformer index={stagePerformerIndex} />
         </Suspense>
      </group>

      <Suspense fallback={null}>
        <Chandelier position={chandelierPos} scale={chandelierScale} />
      </Suspense>

      <Suspense fallback={null}>
        <Usher />
      </Suspense>

      {/* External Area - Stage Door Area with Steel Barricades */}
      <group position={[0, 0, 15]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 7.5]}>
            <planeGeometry args={[20, 15]} />
            <meshStandardMaterial color="#020202" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 7.5]}>
            <planeGeometry args={[3.0, 15]} />
            <meshStandardMaterial color="#700" />
          </mesh>

          {/* Industrial Steel Barricades for the Stage Door Extension */}
          {externalBarricadePositions.map((z, i) => (
            <React.Fragment key={`external-barricade-pair-${i}`}>
                <SteelBarricade position={[1.85, 0, z]} rotation={[0, Math.PI / 2, 0]} />
                <SteelBarricade position={[-1.85, 0, z]} rotation={[0, Math.PI / 2, 0]} />
            </React.Fragment>
          ))}
          
          <pointLight position={[0, 7, 5]} intensity={2.0} distance={30} color="#ffffff" />
          <group position={[0, 0, 0]}>
             {[...Array(6)].map((_, i) => (
                <group key={`fan-l-${i}`} position={[-4.5 + Math.random() * -1, 0, 5 + i * 2]}>
                   <mesh position={[0, 1, 0]}><boxGeometry args={[0.5, 2, 0.5]} /><meshStandardMaterial color={`hsl(${Math.random() * 360}, 30%, 15%)`} /></mesh>
                   <PaparazziFlash position={[0, 1.8, 0.2]} />
                </group>
             ))}
             {[...Array(6)].map((_, i) => (
                <group key={`fan-r-${i}`} position={[4.5 + Math.random() * 1, 0, 5 + i * 2]}>
                   <mesh position={[0, 1, 0]}><boxGeometry args={[0.5, 2, 0.5]} /><meshStandardMaterial color={`hsl(${Math.random() * 360}, 30%, 15%)`} /></mesh>
                   <PaparazziFlash position={[0, 1.8, -0.2]} />
                </group>
             ))}
          </group>
          
          {performerArrived && (
            <group>
               <Performer isSigning={isPerformerSigning} />
            </group>
          )}
      </group>
    </group>
  );
};

export default Lobby;
