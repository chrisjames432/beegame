// player.js

import * as THREE from './three/build/three.module.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';
import { AnimationMixer } from './three/src/animation/AnimationMixer.js';
import { game } from './game.js';
import { JoyStick } from './joystick.js'; 


function getRandomNumberWithTwoDecimals(x, y) {
    if (x > y) {
        // Swap x and y to ensure x is always less than or equal to y
        [x, y] = [y, x];
    }
    const random = Math.random() * (y - x) + x;
    return parseFloat(random.toFixed(2));
  }
  

//random number function ----------------------------------
function randomnumber(min, max) {
    return Math.random() * (max - min) + min;
}




//

//Start of player class --------------------------------------
function Player(game) {
    this.move = {};
    this.move.forward=0;
    this.move.turn=0;
    this.action = '';
    this.game = game
    this.isloaded = false
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Euler(); 
    this.bee=""
    this.socket = game.socket
    this.camdistance = {x:1.5, y:25, z:20}
    this.mixer=''
    this.initialY = 5;
    this.randomdt = getRandomNumberWithTwoDecimals(2,4);
    this.local=false

}




//
//This function sets player position and rotation for local player controls. 
Player.prototype.movePlayer = function (dt) {
 
    if (this.isloaded==true) {
   
        const move = this.move;
        const speed =6;
        const moveSpeed = speed;
        const turnSpeed = speed;
        const bee = this.bee;
    
        if (move) {
            const forwardMovement = move.forward * moveSpeed * dt;
            const turnMovement = move.turn * turnSpeed * dt;

            const pos = bee.position.clone();
            //pos.y += 0;
            pos.x += Math.sin(bee.rotation.y) * forwardMovement;
            pos.z += Math.cos(bee.rotation.y) * forwardMovement;

            bee.position.copy(pos);
            bee.rotation.y += turnMovement;
        }
    }
};


//
//Sets forward and turn for controls and will be used to trigger animations -----------------
Player.prototype.playerControl = function (forward, turn) {

    if (forward < 0) {
        turn = -turn;
        //this.move = { forward, turn };
        this.move.forward=forward
        this.move.turn=turn
    }

    if (forward > 0) {
        if (this.action !== 'walk') this.action = 'walk';
    } else {
        this.action = 'look-around';
    }

    if (forward === 0 && turn === 0) {
      this.tweencam();
      console.log(this.move)
      this.move.forward=0
      this.move.turn=0
    } else {
    
        this.move.forward=forward
        this.move.turn=turn
    }
};


//
//Tweens the local player camera ------------------------------------------------------
Player.prototype.tweencam = function () {
    const currentCameraPosition = this.game.camera.position.clone();
    const distance = this.camdistance;
    const targetCameraPosition = new THREE.Vector3(
        this.bee.position.x + distance.x,
        this.bee.position.y + distance.y,
        this.bee.position.z + distance.z
    );

    const tweenDuration = 2000;
    new TWEEN.Tween(currentCameraPosition)
        .to(targetCameraPosition, tweenDuration)
        .easing(TWEEN.Easing.Quadratic.In)
        .onUpdate(() => {
            
            this.game.camera.position.copy(currentCameraPosition);
        })
        .start();
};



//
//Load gltf and set player start location ----------------------------------
Player.prototype.createPlayer = function (x,z, local=false) {
  

    // Load player model
    var loader = new GLTFLoader();

    loader.load('./client/js/beemodle.glb', (gltf) => {
        
        const bee = gltf.scene;
        var e = 5;
        bee.scale.set(e, e, e);
        // Assuming 10 is the starting Y position
        bee.position.set(x, this.initialY, z);
      
        this.game.scene.add(gltf.scene);
     
        this.mixer = new AnimationMixer(bee);

        // Extracting animations and storing them
        this.animations = gltf.animations
        //console.log(this.animations)
     
           
        
        this.bee=bee
        this.isloaded=true
        this.playAnimation(['wing2Action.003', 'wing2.001Action']);
       
        
        if(local){
        this.local=true
        console.log('local true')
        var distance = this.camdistance;
        this.positionCamera(this.game.camera, gltf.scene, distance.x, distance.y, distance.z);
        game.localplayer.setupKeyControls();

        let localpl = this
        this.joystick = new JoyStick({
            onMove: this.playerControl.bind(localpl),// game.player.playerControl, // Bind the playerControl function to the player instance
            game: game
          });
          
    
       }
  

    });
};



 
let lastElapsedTime = 0;
const animationSpeed = 1.2;
const animationHeight = 0.3;



Player.prototype.update = function(dt){
    const elapsedTime = game.clock.getElapsedTime();
    const deltaTime = elapsedTime - lastElapsedTime
    lastElapsedTime = elapsedTime
   

    if (!!this.bee) {
            
        const oscillation = Math.sin(elapsedTime * animationSpeed) * animationHeight - 0.1;// Math.sin(dt * animationSpeed) * animationHeight;
        this.bee.position.y = this.initialY + oscillation - 0.1;
       
       
       if(this.local) this.movePlayer(dt);
        if (this.mixer) {    this.mixer.update(dt*this.randomdt);}
        
       }
};






Player.prototype.positionCamera = function (camera, mesh, distanceX, distanceY, distanceZ) {
    camera.position.set(mesh.position.x + distanceX, mesh.position.y + distanceY, mesh.position.z + distanceZ);

    var offset = new THREE.Vector3(0, 1, 0);
    var newPosition = mesh.position.clone();
    newPosition.add(offset);
    camera.lookAt(newPosition);
};




Player.prototype.playAnimation = function (names) {
    if (!Array.isArray(this.animations)) {
        console.error('this.animations is not an array:', this.animations);
        return;
    }

    names.forEach(name => {
        const clip = this.animations.find(anim => anim.name === name);
        if (clip) {
            const action = this.mixer.existingAction(clip) || this.mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();
        } else {
            console.error('Animation not found:', name);
        }
    });
};



// Function to send player data to the server
Player.prototype.sendPlayerData = function() {
    if (!this.bee || !this.socket) {
        console.error('Player data or socket is not available');
        return;
    }
    //console.log('playerdata sent')
    // Extract position and rotation data
    const playerData = {
        position: {
            x: this.bee.position.x,
            y: this.bee.position.y,
            z: this.bee.position.z
        },
        rotation: {
            x: this.bee.rotation.x,
            y: this.bee.rotation.y,
            z: this.bee.rotation.z
        }
    };

    // Emit the data to the server
    this.socket.emit('playerData', playerData);
 

};


// Add this method inside the Player.prototype

Player.prototype.setupKeyControls = function () {
    // Object to track the state of each key
    const keyState = { w: false, s: false, a: false, d: false };

    const updateMovement = () => {
        let forward = 0;
        let turn = 0;

        if (keyState.w) forward += 1;
        if (keyState.s) forward -= 1;
        if (keyState.a) turn += 1;
        if (keyState.d) turn -= 1;

        this.playerControl(forward, turn);
    };

    window.addEventListener('keydown', (event) => {
        if (['w', 's', 'a', 'd'].includes(event.key)) {
            keyState[event.key] = true;
            updateMovement();
        }
    });

    window.addEventListener('keyup', (event) => {
        if (['w', 's', 'a', 'd'].includes(event.key)) {
            keyState[event.key] = false;
            updateMovement();
        }
    });
};


// You should call this method after creating an instance of the Player class
// For example:
// var player = new Player(game);
// player.setupKeyControls();


Player.prototype.updatePosition = function(position, rotation) {
    if (!this.bee) {
        console.error('Bee object does not exist');
        return;
    }

    // Update position
    if (position) {
        this.bee.position.set(position.x, position.y, position.z);
    }

    // Update rotation
    if (rotation) {
        this.bee.rotation.set(rotation.x, rotation.y, rotation.z);
    }
};
export { Player };
