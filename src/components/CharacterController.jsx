import { Billboard, CameraControls, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, vec3 } from "@react-three/rapier";
import { isHost } from "playroomkit";
import { useEffect, useRef, useState } from "react";
import { CharacterSoldier } from "./CharacterSoldier";
const MOVEMENT_SPEED = 202;
const FIRE_RATE = 380;
const JUMP_FORCE = 20;
var i = 0;
export const WEAPON_OFFSET = {
  x: -0.2,
  y: 1.4,
  z: 0.8,
};

const WEAPONS = [
  "GrenadeLauncher",
  "AK",
  "Knife_1",
  "Knife_2",
  "Pistol",
  "Revolver",
  "Revolver_Small",
  "RocketLauncher",
  "ShortCannon",
  "SMG",
  "Shotgun",
  "Shovel",
  "Sniper",
  "Sniper_2",
];

export const CharacterController = ({
  state,
  joystick,
  userPlayer,
  onKilled,
  onFire,
  downgradedPerformance,
  ...props
}) => {
  const [weapon, setWeapon] = useState("AK");
  console.log("useState call :", weapon);
  const group = useRef();
  const character = useRef();
  const rigidbody = useRef();
  const [animation, setAnimation] = useState("Idle");
  const lastShoot = useRef(0);

  const scene = useThree((state) => state.scene);
  const spawnRandomly = () => {
    const spawns = [];
    for (let i = 0; i < 1000; i++) {
      const spawn = scene.getObjectByName(`spawn_${i}`);
      if (spawn) {
        spawns.push(spawn);
      } else {
        break;
      }
    }
    const spawnPos = spawns[Math.floor(Math.random() * spawns.length)].position;
    rigidbody.current.setTranslation(spawnPos);
  };

  useEffect(() => {
    if (isHost()) {
      spawnRandomly();
    }
  }, []);

  useEffect(() => {
    if (state.state.dead) {
      const audio = new Audio("/audios/dead.mp3");
      audio.volume = 0.5;
      audio.play();
    }
  }, [state.state.dead]);

  useEffect(() => {
    if (state.state.health < 100) {
      const audio = new Audio("/audios/hurt.mp3");
      audio.volume = 0.4;
      audio.play();
    }
  }, [state.state.health]);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isFPressed, setIsFPressed] = useState(false);

  // Set up key event listeners
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === "Space") {
        setIsSpacePressed(true);
      }
      if (event.key === "f" || event.key === "F") {
        setIsFPressed(true);
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
      if (event.key === "f" || event.key === "F") {
        setIsFPressed(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    // Clean up event listeners
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  const [arrowKeys, setArrowKeys] = useState({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  // Set up arrow key event listeners
  useEffect(() => {
    const handleKeyDown = (event) => {
      const newArrowKeys = { ...arrowKeys };
      if (event.key === "ArrowUp") newArrowKeys.up = true;
      if (event.key === "ArrowDown") newArrowKeys.down = true;
      if (event.key === "ArrowLeft") newArrowKeys.left = true;
      if (event.key === "ArrowRight") newArrowKeys.right = true;
      setArrowKeys(newArrowKeys);
    };

    const handleKeyUp = (event) => {
      const newArrowKeys = { ...arrowKeys };
      if (event.key === "ArrowUp") newArrowKeys.up = false;
      if (event.key === "ArrowDown") newArrowKeys.down = false;
      if (event.key === "ArrowLeft") newArrowKeys.left = false;
      if (event.key === "ArrowRight") newArrowKeys.right = false;
      setArrowKeys(newArrowKeys);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    // Clean up event listeners
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [arrowKeys]);
  const calculateAngle = () => {
    const { up, down, left, right } = arrowKeys;

    // Adjust angles based on your game's coordinate system
    if (up && !down) {
      if (left && !right) return (5 * Math.PI) / 4; // Up-Left
      if (right && !left) return (7 * Math.PI) / 4; // Up-Right
      return 0; // Up
    }
    if (down && !up) {
      if (left && !right) return (3 * Math.PI) / 4; // Down-Left
      if (right && !left) return Math.PI / 4; // Down-Right
      return Math.PI; // Down
    }
    if (left && !right) return (3 * Math.PI) / 2; // Left
    if (right && !left) return Math.PI / 2; // Right

    return null; // No arrow key pressed
  };

  useFrame((_, delta) => {
    // CAMERA FOLLOW

    // if (joystick.isPressed("swap")) {
    //   setWeapon(WEAPONS[i]);

    //   if(i == WEAPONS.length){
    //     i=0
    //   }else{
    //     i++;
    //   }
    //   // CharacterSoldier({color:state.state.profile?.color,animation:animation,weapon:weapon})
    //   console.log("Weapons are swaapped...!", weapon)
    // }

    if (controls.current) {
      const cameraDistanceY = window.innerWidth < 1024 ? 16 : 20;
      const cameraDistanceZ = window.innerWidth < 1024 ? 12 : 16;
      const playerWorldPos = vec3(rigidbody.current.translation());
      controls.current.setLookAt(
        playerWorldPos.x,
        playerWorldPos.y + (state.state.dead ? 12 : cameraDistanceY),
        playerWorldPos.z + (state.state.dead ? 2 : cameraDistanceZ),
        playerWorldPos.x,
        playerWorldPos.y + 1.5,
        playerWorldPos.z,
        true
      );
    }

    if (state.state.dead) {
      setAnimation("Death");
      return;
    }

    // Update player position based on joystick state
    let angle = joystick.isJoystickPressed()
      ? joystick.angle()
      : calculateAngle();
    if (angle !== null) {
      setAnimation("Run");
      character.current.rotation.y = angle;

      // Movement logic
      const impulse = {
        x: Math.sin(angle) * MOVEMENT_SPEED * delta,
        y: 0,
        z: Math.cos(angle) * MOVEMENT_SPEED * delta,
      };
      rigidbody.current.applyImpulse(impulse, true);
    } else {
      setAnimation("Idle");
    }
    const playerWorldPos = vec3(rigidbody.current.translation());

    if (
      (joystick.isPressed("jump") && playerWorldPos.y < 2) ||
      (isSpacePressed && playerWorldPos.y < 2)
    ) {
      setAnimation("Run");
      character.current.rotation.y = angle;

      // move character in its own direction
      const impulse = {
        x: Math.sin(angle) * MOVEMENT_SPEED * delta,
        y: JUMP_FORCE,
        z: Math.cos(angle) * MOVEMENT_SPEED * delta,
      };
      rigidbody.current.applyImpulse(impulse, true);
    } else {
      const impulse = {
        x: 0,
        y: -2,
        z: 0,
      };
      if (playerWorldPos.y > 0) {
        rigidbody.current.applyImpulse(impulse, true);
      }
    }
    // Check if fire button is pressed
    if (isFPressed || joystick.isPressed("fire")) {
      setAnimation("Run_Shoot");
      if (isHost() && Date.now() - lastShoot.current > FIRE_RATE) {
        lastShoot.current = Date.now();
        const newBullet = {
          id: state.id + "-" + +new Date(),
          position: vec3(rigidbody.current.translation()),
          angle: angle ?? joystick.angle(), // Use the current angle or joystick angle if available
          player: state.id,
        };
        onFire(newBullet);
      }
    }

    if (isHost()) {
      state.setState("pos", rigidbody.current.translation());
    } else {
      const pos = state.getState("pos");
      if (pos) {
        rigidbody.current.setTranslation(pos);
      }
    }
  });
  const controls = useRef();
  const directionalLight = useRef();

  useEffect(() => {
    if (character.current && userPlayer) {
      directionalLight.current.target = character.current;
    }
  }, [character.current]);

  return (
    <group {...props} ref={group}>
      {userPlayer && <CameraControls ref={controls} />}
      <RigidBody
        ref={rigidbody}
        colliders={false}
        linearDamping={12}
        lockRotations
        type={isHost() ? "dynamic" : "kinematicPosition"}
        onIntersectionEnter={({ other }) => {
          if (
            isHost() &&
            other.rigidBody.userData.type === "bullet" &&
            state.state.health > 0
          ) {
            const newHealth =
              state.state.health - other.rigidBody.userData.damage;
            if (newHealth <= 0) {
              state.setState("deaths", state.state.deaths + 1);
              state.setState("dead", true);
              state.setState("health", 0);
              rigidbody.current.setEnabled(false);
              setTimeout(() => {
                spawnRandomly();
                rigidbody.current.setEnabled(true);
                state.setState("health", 100);
                state.setState("dead", false);
              }, 2000);
              onKilled(state.id, other.rigidBody.userData.player);
            } else {
              state.setState("health", newHealth);
            }
          }
        }}
      >
        <PlayerInfo state={state.state} />
        <group ref={character}>
          <CharacterSoldier
            color={state.state.profile?.color}
            animation={animation}
            weapon={weapon}
          />
          {userPlayer && (
            <Crosshair
              position={[WEAPON_OFFSET.x, WEAPON_OFFSET.y, WEAPON_OFFSET.z]}
            />
          )}
        </group>
        {userPlayer && (
          // Finally I moved the light to follow the player
          // This way we won't need to calculate ALL the shadows but only the ones
          // that are in the camera view
          <directionalLight
            ref={directionalLight}
            position={[25, 18, -25]}
            intensity={0.3}
            castShadow={!downgradedPerformance} // Disable shadows on low-end devices
            shadow-camera-near={0}
            shadow-camera-far={100}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.0001}
          />
        )}
        <CapsuleCollider args={[0.7, 0.6]} position={[0, 1.28, 0]} />
      </RigidBody>
    </group>
  );
};

const PlayerInfo = ({ state }) => {
  const health = state.health;
  const name = state.profile.name;
  return (
    <Billboard position-y={2.5}>
      <Text position-y={0.36} fontSize={0.4}>
        {name}
        <meshBasicMaterial color={state.profile.color} />
      </Text>
      <mesh position-z={-0.1}>
        <planeGeometry args={[1, 0.2]} />
        <meshBasicMaterial color="black" transparent opacity={0.5} />
      </mesh>
      <mesh scale-x={health / 100} position-x={-0.5 * (1 - health / 100)}>
        <planeGeometry args={[1, 0.2]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </Billboard>
  );
};

const Crosshair = (props) => {
  return (
    <group {...props}>
      <mesh position-z={1}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="black" transparent opacity={0.9} />
      </mesh>
      <mesh position-z={2}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="black" transparent opacity={0.85} />
      </mesh>
      <mesh position-z={3}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="black" transparent opacity={0.8} />
      </mesh>

      <mesh position-z={4.5}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="black" opacity={0.7} transparent />
      </mesh>

      <mesh position-z={6.5}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="black" opacity={0.6} transparent />
      </mesh>

      <mesh position-z={9}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial color="black" opacity={0.2} transparent />
      </mesh>
    </group>
  );
};
