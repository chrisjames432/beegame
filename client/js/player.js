// player.js

import * as THREE from './three/build/three.module.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import { TWEEN } from './three/examples/jsm/libs/tween.module.min.js';
import { AnimationMixer } from './three/src/animation/AnimationMixer.js';
import { game } from './game.js';

function Player(game,socket) {
    this.move = {};
    this.move.forward=0;
    this.move.turn=0;
    this.action = '';
    this.game = game
    this.isloaded = false
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Euler(); 
    this.bee=""
    this.socket = socket
    this.camdistance = {x:1.5, y:5, z:10}
}

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
      this.move.forward=0
      this.move.turn=0
    } else {
    
        this.move.forward=forward
        this.move.turn=turn
    }
};

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


function randomnumber(min, max) {
    return Math.random() * (max - min) + min;
}


Player.prototype.createPlayer = function () {
   
    let lastElapsedTime = 0;
    const animationSpeed = 1.2;
    const animationHeight = 0.3;

    // Load player model
    var loader = new GLTFLoader();

    loader.load('./client/js/beemodle.glb', (gltf) => {
        
        const bee = gltf.scene;
        var e = 5;
        bee.scale.set(e, e, e);
        this.initialY = 5; // Assuming 10 is the starting Y position
        bee.position.set(0, this.initialY, 0);
      
        this.game.scene.add(gltf.scene);
        var distance = this.camdistance;
        this.positionCamera(this.game.camera, gltf.scene, distance.x, distance.y, distance.z);
        this.game.player = bee;
        this.mixer = new AnimationMixer(bee);

        // Extracting animations and storing them
        this.animations = gltf.animations
        console.log(this.animations)
        this.game.animations['localplayer'] = () => {

            const dt  = game.clock.getDelta() ;
            const elapsedTime = game.clock.getElapsedTime();
            const deltaTime = elapsedTime - lastElapsedTime
            lastElapsedTime = elapsedTime

            if (!!bee) {
                    
                const oscillation = Math.sin(elapsedTime * animationSpeed) * animationHeight - 0.1;// Math.sin(dt * animationSpeed) * animationHeight;
                bee.position.y = this.initialY + oscillation - 0.1;
                this.movePlayer(dt);
                
                

                   if (this.mixer) {
        this.mixer.update(dt);
    }
            }
        };

           
        
        this.bee=bee
        this.isloaded=true

        $('#loading_div').delay(200).fadeOut(300);
        let plr = this
        setTimeout(function(){
            plr.playAnimation(['wing2Action.003', 'wing2.001Action']);
            setInterval(function(){plr.sendPlayerData()}  ,1000/60);
        
        
        
        },1000);

    });
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




export { Player };
