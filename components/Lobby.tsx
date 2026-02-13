
import React, { useRef, Suspense, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D } from 'three';
import { useGLTF, useAnimations, useTexture, Text, Environment } from '@react-three/drei';
import * as THREE_LIB from 'three';

const THREE = THREE_LIB;

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

const LOBBY_WIDTH = 17;
const LOBBY_HEIGHT = 6;
const LOBBY_DEPTH = 14.8;
const DOOR_OPENING_WIDTH = 3.5;
const WALL_OVERLAP = 0.6; 

const USHER_MODEL_URL = 'https://raw.githubusercontent.com/heyitisjee/theater-assets/bd44fe10a9cfa22b5d8935e6b77d2484a0f561dd/talking-v2.glb';
const CELEB_MODEL_URL = 'https://raw.githubusercontent.com/heyitisjee/theater-assets/efe80f79f15b0759e611c58fb180651ae51ef3fe/walkingceleb-v1.glb';

const Crowd: React.FC = () => (
  <group position={[0, 0, 16.5]}>
    {[-2.8, -2.1, -1.4, 1.4, 2.1, 2.8].map((x, i) => (
      <group key={i} position={[x, 0, 0]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.85, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.9, 4, 8]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#111" : (i % 3 === 1 ? "#222" : "#050505")} />
        </mesh>
        <mesh position={[0, 1.75, 0]} castShadow>
          <sphereGeometry args={[0.18]} />
          <meshStandardMaterial color="#f5d5b0" />
        </mesh>
      </group>
    ))}
  </group>
);

const VelvetStanchion: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    {/* Even smaller refined gold base */}
    <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.1, 0.1, 0.06]} /><meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} /></mesh>
    {/* Thinner gold pole */}
    <mesh position={[0, 0.43, 0]}><cylinderGeometry args={[0.015, 0.015, 0.8]} /><meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} /></mesh>
    {/* Smaller gold sphere cap */}
    <mesh position={[0, 0.83, 0]}><sphereGeometry args={[0.045]} /><meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} /></mesh>
  </group>
);

const Usher: React.FC = () => {
  const groupRef = useRef<THREE_LIB.Group>(null);
  const { scene, animations } = useGLTF(USHER_MODEL_URL);
  const { actions } = useAnimations(animations, groupRef);
  
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          const mat = child.material as THREE_LIB.MeshStandardMaterial;
          mat.transparent = false;
          mat.opacity = 1.0;
          mat.side = THREE.FrontSide;
          mat.depthWrite = true;
          mat.depthTest = true;
          mat.alphaTest = 0.5;
        }
      }
    });
    if (actions && Object.keys(actions).length > 0) {
      actions[Object.keys(actions)[0]]?.reset().fadeIn(0.5).play();
    }
  }, [actions, scene]);

  return (
    <group 
      ref={groupRef} 
      name="UsherGroup"
      position={[3.0, 0.0, 2.0]} 
      rotation={[0, -0.6, 0]} 
      scale={[1.2, 1.2, 1.2]} 
      userData={{ type: 'usher' }}
    >
      <primitive object={scene} />
    </group>
  );
};

const Barricades: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 20.8]}>
      <planeGeometry args={[DOOR_OPENING_WIDTH + 0.5, 12]} />
      <meshStandardMaterial color="#990000" roughness={0.8} polygonOffset polygonOffsetFactor={-1} />
    </mesh>

    <group position={[0, 0, 18.2]}>
      {[-1.8, -0.9, 0, 0.9, 1.8].map(x => (
        <group key={`met-${x}`} position={[x, 0, 0]}>
          <mesh position={[0, 0.6, 0]}><boxGeometry args={[0.08, 1.4, 0.08]} /><meshStandardMaterial color="#aaaaaa" metalness={1} roughness={0.1} /></mesh>
          <mesh position={[0, 1.4, 0]}><boxGeometry args={[0.15, 0.12, 0.15]} /><meshStandardMaterial color="#cccccc" metalness={1} roughness={0.05} /></mesh>
        </group>
      ))}
      <mesh position={[0, 1.2, 0]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.04, 0.04, 3.8]} /><meshStandardMaterial color="#222222" metalness={0.5} roughness={0.8} /></mesh>
      <mesh position={[0, 0.6, 0]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.04, 0.04, 3.8]} /><meshStandardMaterial color="#222222" metalness={0.5} roughness={0.8} /></mesh>
    </group>
  </group>
);

const Performer: React.FC<{ isSigning: boolean, isWalkingEnabled: boolean }> = ({ isWalkingEnabled, isSigning }) => {
  const groupRef = useRef<THREE_LIB.Group>(null);
  const { scene, animations } = useGLTF(CELEB_MODEL_URL);
  const { actions } = useAnimations(animations, groupRef);
  const [reachedTarget, setReachedTarget] = useState(false);

  useEffect(() => { 
    if (actions && Object.keys(actions).length > 0 && isWalkingEnabled) {
      actions[Object.keys(actions)[0]]?.reset().play();
    }
  }, [actions, isWalkingEnabled]);

  useFrame((state, delta) => {
    if (groupRef.current && isWalkingEnabled && !reachedTarget) {
      const targetZ = 18.8; 
      const direction = (targetZ - groupRef.current.position.z);
      if (Math.abs(direction) > 0.05) {
        groupRef.current.position.z += Math.sign(direction) * delta * 1.8;
      } else {
        setReachedTarget(true);
        if (actions && Object.keys(actions).length > 0) {
          const action = actions[Object.keys(actions)[0]];
          if (action) action.paused = true; 
        }
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.1);
      }
    }
  });

  return (
    <group ref={groupRef} name="PerformerGroup" position={[0, 0, 26.0]} rotation={[0, Math.PI, 0]} userData={{ type: 'performer' }}>
      <primitive object={scene} scale={[1.1, 1.1, 1.1]} />
    </group>
  );
};

const AuditoriumAisleLights: React.FC = () => (
  <group>
    {[-14.0, 14.0].map(x => (
       <group key={x} position={[x, 0, 0]}>
         {[6, 3.6, 1.2, -1.2, -3.6, -6.0].map(z => (
           <group key={z} position={[0, 1.0, z]}>
              <pointLight color="#ffcc33" intensity={25} distance={12} />
              <mesh><sphereGeometry args={[0.18]} /><meshBasicMaterial color="#ffaa00" /></mesh>
           </group>
         ))}
       </group>
    ))}
  </group>
);

const StageModel: React.FC = () => {
  const { scene } = useGLTF('https://raw.githubusercontent.com/heyitisjee/theater-assets/5b0219c9783e687cfe75d19f05ca43ff9496bb9b/staged-v1.glb');
  useEffect(() => {
    scene.traverse((child: Object3D) => {
      if (child.name.toLowerCase().includes('light')) child.visible = false;
      if (child instanceof THREE.Mesh) { child.receiveShadow = true; child.castShadow = true; }
    });
  }, [scene]);
  return <primitive object={scene} name="StageModel" position={[0, 0, -11.0]} rotation={[0, -1.5708, 0]} scale={[0.6, 0.6, 0.6]} />;
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
    if (actions && Object.keys(actions).length > 0) actions[Object.keys(actions)[0]]?.reset().fadeIn(0.5).play();
  }, [actions, index]);
  
  // Slightly lowered Y position (from 5.35 to 5.25)
  return (
    <group position={[0.7, 5.25, -13.5]} rotation={[0, 0, 0]}>
      <primitive object={scene} scale={[1.4, 1.4, 1.4]} />
      <spotLight position={[0, 10, 5]} intensity={200} angle={0.4} penumbra={1} color="#ffffff" castShadow />
    </group>
  );
};

const Chandelier: React.FC<{ position: [number, number, number], scale: number }> = ({ position, scale }) => {
  const { scene } = useGLTF('https://raw.githubusercontent.com/heyitisjee/theater-assets/2a1b1d9ea924eec7f9c28887e328da6dfd12c557/light-v1%20(2).glb');
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <primitive object={scene} />
      <pointLight position={[0, 0, 0]} intensity={80} distance={25} color="#ffffff" castShadow />
    </group>
  );
};

const PosterWithLight: React.FC<{ position: [number, number, number], rotation: [number, number, number], textureUrl: string, name: string, highlighted: boolean }> = ({ position, rotation, textureUrl, name, highlighted }) => {
  const texture = useTexture(textureUrl);
  return (
    <group position={position} rotation={rotation}>
      <spotLight position={[0, 2.0, 1]} intensity={6} angle={0.4} penumbra={1} color="#fff4e0" />
      <mesh name={name} userData={{ type: 'poster' }} position={[0, 0, 0.05]}>
        <planeGeometry args={[1.8, 2.7]} />
        <meshStandardMaterial 
          map={texture} 
          emissive="#ffffff" 
          emissiveMap={texture} 
          emissiveIntensity={highlighted ? 1.0 : 0.05} 
          side={THREE.FrontSide}
          polygonOffset
          polygonOffsetFactor={-4}
        />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[1.9, 2.85, 0.06]} />
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  );
};

const TheaterSeat: React.FC<{ position: [number, number, number], name: string }> = ({ position, name }) => (
  <group position={position} rotation={[0, Math.PI, 0]}>
    <mesh position={[0, 0.25, 0]} castShadow>
      <boxGeometry args={[0.1, 0.5, 0.1]} />
      <meshStandardMaterial color="#1a1a1a" metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.05, 0]} castShadow>
      <boxGeometry args={[0.5, 0.1, 0.5]} />
      <meshStandardMaterial color="#111" />
    </mesh>
    <mesh name={name} userData={{ type: 'chair' }} position={[0, 0.55, 0]} castShadow>
      <boxGeometry args={[1.0, 0.2, 0.9]} />
      <meshStandardMaterial color="#600000" roughness={0.7} />
    </mesh>
    <mesh position={[0, 1.15, -0.4]} castShadow>
      <boxGeometry args={[1.0, 1.1, 0.15]} />
      <meshStandardMaterial color="#600000" roughness={0.7} />
    </mesh>
  </group>
);

const Riser: React.FC<{ position: [number, number, number], width: number, depth: number, height: number }> = ({ position, width, depth, height }) => (
  <mesh position={position} receiveShadow>
    <boxGeometry args={[width, height, depth]} />
    <meshStandardMaterial color="#111" roughness={1} />
  </mesh>
);

const Lobby: React.FC<LobbyProps> = ({ highlightedPoster, auditoriumDoorOpen, lobbyDoorOpen, performerArrived, stagePerformerIndex = 0, isPerformerSigning = false, chandelierPos = [0, -1.0, 7.5], chandelierScale = 0.4 }) => {
  const leftAudDoorRef = useRef<THREE_LIB.Group>(null);
  const rightAudDoorRef = useRef<THREE_LIB.Group>(null);
  const leftLobbyDoorRef = useRef<THREE_LIB.Group>(null);
  const rightLobbyDoorRef = useRef<THREE_LIB.Group>(null);

  const posterUrls = [
    "https://raw.githubusercontent.com/heyitisjee/theater-assets/b1960f5ef0a3ec18401b799b50491f642393eb17/poster1.png", 
    "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/poster2.png", 
    "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/poster3.png", 
    "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/poster4.png", 
    "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/poster5.png", 
    "https://raw.githubusercontent.com/heyitisjee/theater-assets/main/poster6.png"
  ];

  useFrame(() => {
    if (leftAudDoorRef.current && rightAudDoorRef.current) { 
        const target = auditoriumDoorOpen ? -Math.PI / 1.7 : 0; 
        leftAudDoorRef.current.rotation.y += (target - leftAudDoorRef.current.rotation.y) * 0.1; 
        rightAudDoorRef.current.rotation.y += (-target - rightAudDoorRef.current.rotation.y) * 0.1; 
    }
    if (leftLobbyDoorRef.current && rightLobbyDoorRef.current) { 
        const target = lobbyDoorOpen ? Math.PI / 1.7 : 0; 
        leftLobbyDoorRef.current.rotation.y += (target - leftLobbyDoorRef.current.rotation.y) * 0.1; 
        rightLobbyDoorRef.current.rotation.y += (-target - rightLobbyDoorRef.current.rotation.y) * 0.1; 
    }
  });

  const lobbyWallMat = useMemo(() => <meshStandardMaterial color="#ffffff" roughness={0.01} side={THREE.FrontSide} />, []);

  // Use 5 sets of stanchions along the carpet for a clean guide
  const stanchionZOffsets = [-6.2, -2.8, 0.6, 4.0, 7.4];

  return (
    <group>
      <Suspense fallback={null}><Environment preset="city" /></Suspense>
      
      <group position={[0, LOBBY_HEIGHT / 2, 0.01]}>
        <mesh position={[-(DOOR_OPENING_WIDTH / 2 + (LOBBY_WIDTH - DOOR_OPENING_WIDTH) / 4), 0, 0]}><boxGeometry args={[(LOBBY_WIDTH - DOOR_OPENING_WIDTH) / 2 + WALL_OVERLAP, LOBBY_HEIGHT, 0.4]} />{lobbyWallMat}</mesh>
        <mesh position={[(DOOR_OPENING_WIDTH / 2 + (LOBBY_WIDTH - DOOR_OPENING_WIDTH) / 4), 0, 0]}><boxGeometry args={[(LOBBY_WIDTH - DOOR_OPENING_WIDTH) / 2 + WALL_OVERLAP, LOBBY_HEIGHT, 0.4]} />{lobbyWallMat}</mesh>
        <mesh position={[0, (LOBBY_HEIGHT / 4 + 1.5) / 2, 0]}><boxGeometry args={[DOOR_OPENING_WIDTH + WALL_OVERLAP, LOBBY_HEIGHT / 2, 0.4]} />{lobbyWallMat}</mesh>
      </group>

      <group position={[1.75, 0, 0.01]} ref={rightAudDoorRef}><mesh position={[-0.9, 1.5, 0]}><boxGeometry args={[1.8, 3.1, 0.2]} /><meshStandardMaterial color="#1a0401" /></mesh></group>
      <group position={[-1.75, 0, 0.01]} ref={leftAudDoorRef}><mesh position={[0.9, 1.5, 0]}><boxGeometry args={[1.8, 3.1, 0.2]} /><meshStandardMaterial color="#1a0401" /></mesh></group>
      
      <group>
        <group position={[0, 0, LOBBY_DEPTH / 2]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[LOBBY_WIDTH + WALL_OVERLAP, LOBBY_DEPTH + WALL_OVERLAP]} /><meshStandardMaterial color="#ffffff" roughness={0.1} /></mesh>
          
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
            <planeGeometry args={[4.5, LOBBY_DEPTH + WALL_OVERLAP]} />
            <meshStandardMaterial color="#880000" roughness={1.0} />
          </mesh>

          {/* Velvet stanchions lining the guide way */}
          {stanchionZOffsets.map((z, i) => (
            <React.Fragment key={i}>
              <VelvetStanchion position={[-2.4, 0, z]} />
              <VelvetStanchion position={[2.4, 0, z]} />
            </React.Fragment>
          ))}

          <mesh position={[-(LOBBY_WIDTH / 2), LOBBY_HEIGHT / 2, 0]} rotation={[0, Math.PI/2, 0]}><planeGeometry args={[LOBBY_DEPTH + WALL_OVERLAP, LOBBY_HEIGHT]} />{lobbyWallMat}</mesh>
          <mesh position={[(LOBBY_WIDTH / 2), LOBBY_HEIGHT / 2, 0]} rotation={[0, -Math.PI/2, 0]}><planeGeometry args={[LOBBY_DEPTH + WALL_OVERLAP, LOBBY_HEIGHT]} />{lobbyWallMat}</mesh>
          <mesh position={[0, LOBBY_HEIGHT, 0]} rotation={[Math.PI/2, 0, 0]}><planeGeometry args={[LOBBY_WIDTH + WALL_OVERLAP, LOBBY_DEPTH + WALL_OVERLAP]} />{lobbyWallMat}</mesh>
        </group>

        <group position={[0, LOBBY_HEIGHT / 2, LOBBY_DEPTH]}>
          <mesh position={[-(DOOR_OPENING_WIDTH / 2 + (LOBBY_WIDTH - DOOR_OPENING_WIDTH) / 4), 0, 0]}><boxGeometry args={[(LOBBY_WIDTH - DOOR_OPENING_WIDTH) / 2 + WALL_OVERLAP, LOBBY_HEIGHT, 0.4]} />{lobbyWallMat}</mesh>
          <mesh position={[(DOOR_OPENING_WIDTH / 2 + (LOBBY_WIDTH - DOOR_OPENING_WIDTH) / 4), 0, 0]}><boxGeometry args={[(LOBBY_WIDTH - DOOR_OPENING_WIDTH) / 2 + WALL_OVERLAP, LOBBY_HEIGHT, 0.4]} />{lobbyWallMat}</mesh>
          <mesh position={[0, (LOBBY_HEIGHT / 4 + 1.5) / 2, 0]}><boxGeometry args={[DOOR_OPENING_WIDTH + WALL_OVERLAP, LOBBY_HEIGHT / 2, 0.4]} />{lobbyWallMat}</mesh>
          <group position={[0, 0.6, 0.3]}><Suspense fallback={null}><Text fontSize={0.35} color="#ffd700" anchorX="center" anchorY="middle">STAGE DOOR</Text></Suspense></group>
        </group>
        
        <group position={[1.75, 0, LOBBY_DEPTH]} ref={rightLobbyDoorRef}><mesh position={[-0.9, 1.5, 0]}><boxGeometry args={[1.8, 3.1, 0.2]} /><meshStandardMaterial color="#1a0401" /></mesh></group>
        <group position={[-1.75, 0, LOBBY_DEPTH]} ref={leftLobbyDoorRef}><mesh position={[0.9, 1.5, 0]}><boxGeometry args={[1.8, 3.1, 0.2]} /><meshStandardMaterial color="#1a0401" /></mesh></group>
        
        <Suspense fallback={null}>
          <Chandelier position={chandelierPos} scale={chandelierScale} />
          <Usher />
          <Barricades />
          <Crowd />
          <PosterWithLight name="First Filter Poster" position={[-(LOBBY_WIDTH / 2 - 0.05), 2.5, 3.5]} rotation={[0, Math.PI/2, 0]} textureUrl={posterUrls[0]} highlighted={highlightedPoster === "First Filter Poster"} />
          <PosterWithLight name="Korean Theater Poster 1" position={[-(LOBBY_WIDTH / 2 - 0.05), 2.5, 7.5]} rotation={[0, Math.PI/2, 0]} textureUrl={posterUrls[1]} highlighted={highlightedPoster === "Korean Theater Poster 1"} />
          <PosterWithLight name="Korean Theater Poster 2" position={[-(LOBBY_WIDTH / 2 - 0.05), 2.5, 11.5]} rotation={[0, Math.PI/2, 0]} textureUrl={posterUrls[2]} highlighted={highlightedPoster === "Korean Theater Poster 2"} />
          <PosterWithLight name="Theater Club Promotion Poster" position={[(LOBBY_WIDTH / 2 - 0.05), 2.5, 3.5]} rotation={[0, -Math.PI/2, 0]} textureUrl={posterUrls[3]} highlighted={highlightedPoster === "Theater Club Promotion Poster"} />
          <PosterWithLight name="Broadway Playbill Poster" position={[(LOBBY_WIDTH / 2 - 0.05), 2.5, 7.5]} rotation={[0, -Math.PI/2, 0]} textureUrl={posterUrls[4]} highlighted={highlightedPoster === "Broadway Playbill Poster"} />
          <PosterWithLight name="Theater & AR Portfolio poster" position={[(LOBBY_WIDTH / 2 - 0.05), 2.5, 11.5]} rotation={[0, -Math.PI/2, 0]} textureUrl={posterUrls[5]} highlighted={highlightedPoster === "Theater & AR Portfolio poster"} />
        </Suspense>
        {performerArrived && <Suspense fallback={null}><Performer isSigning={isPerformerSigning} isWalkingEnabled={performerArrived} /></Suspense>}
      </group>

      <group position={[0, 0, -8.5]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,-0.01,0]} receiveShadow><planeGeometry args={[32, 20]} /><meshStandardMaterial color="#050505" roughness={1.0} /></mesh>
        <group key="left-wall" position={[-16, LOBBY_HEIGHT/2, 0]}><mesh><boxGeometry args={[0.2, LOBBY_HEIGHT, 30]} /><meshStandardMaterial color="#111111" /></mesh></group>
        <group key="right-wall" position={[16, LOBBY_HEIGHT/2, 0]}><mesh><boxGeometry args={[0.2, LOBBY_HEIGHT, 30]} /><meshStandardMaterial color="#111111" /></mesh></group>
        
        <AuditoriumAisleLights />
        
        <Suspense fallback={null}>
          <StageModel />
          <StagePerformer index={stagePerformerIndex} />
        </Suspense>

        <group position={[0, 0, 0]}>
          {[0, 1, 2, 3].map(row => {
            const zPos = 5.5 - (3 - row) * 2.2;
            const riserHeight = row * 0.45;
            return (
              <group key={row} position={[0, 0, zPos]}>
                <Riser position={[0, riserHeight / 2, 0]} width={18} depth={2.0} height={riserHeight} />
                {[-4.8, -3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6, 4.8].map(col => (
                  <TheaterSeat key={col} name={`Seat-${row}-${col}`} position={[col, riserHeight, 0]} />
                ))}
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
};

export default Lobby;
