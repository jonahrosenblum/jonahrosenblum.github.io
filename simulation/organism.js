// this is a class which controls and keeps track of each organism's body,
// fitness, and movements.
class Organism {

  constructor(body, order, organismBrain, bodyGenerator) {
    this.body = body;
    this.fitness = 0;
    this.eyeIndex1 = undefined;
    this.eyeIndex2 = undefined;
    this.mouthIndex = undefined;
    this.organismBrain = organismBrain;
    this.bodyGenerator = bodyGenerator;
    this.order = order;
    this.brainMutationRate = .05;
    this.bodyMutationRate = .05;

    // these are values that will be given to the brain so it can understand its body
    for (let i = 0; i < this.body.parts.length; ++i) {
      if (body.parts[i].label === eye && !this.eyeIndex1) {
        this.eyeIndex1 = i;
      } else if (body.parts[i].label === eye){
        this.eyeIndex2 = i;
      } else if (body.parts[i].label === mouth) {
        this.mouthIndex = i;
      }
    }
  }

  getID() {
    return this.id;
  }

  getFitness() {
    return this.fitness;
  }

  survivalBonus() {
    this.fitness += .1;
  }

  eatBrain() {
    this.fitness += 5;
  }


  getRaycast(eyeIndex) {
    // this list of bodies is useful for raycasting
    const bodies = Composite.allBodies(engine.world);
    const xMultiplier = Math.cos(this.body.parts[eyeIndex].angle + this.body.angle);
    const yMultiplier = Math.sin(this.body.parts[eyeIndex].angle + this.body.angle);
    
    // why such a large number? smaller numbers don't work for some reason.
    const array = raycast(bodies, this.body.parts[eyeIndex].position, 
        { x: xMultiplier * 1E5, 
          y: yMultiplier * 1E5
        });
    // remove all raycast collisions with the organisms own body
    while(array.last() && array.last().body.parent.id === this.body.id) {
      array.pop();
    }
    return array;       
  }

  getBrainInputs(bodies1, bodies2) {
    if (!this.body || bodies1 === [] || bodies1.last() === undefined) return;
    let brainInputs = [];
    const eyeAngle1 = this.body.parts[this.eyeIndex1].angle - this.body.angle;
    const eyeToMouthAngle1 = this.body.parts[this.mouthIndex].angle - this.body.parts[this.eyeIndex1].angle
    const eyeAngle2 = this.body.parts[this.eyeIndex2].angle - this.body.angle;
    const eyeToMouthAngle2 = this.body.parts[this.mouthIndex].angle - this.body.parts[this.eyeIndex2].angle
    // give inputs for the brain to make a decision about what the next move
    // will be - we will give it the current velocity, current angle relative
    // to what it sees, the angle between the eye and mouth, the distance to 
    // the closest object, and the type of the current object.
    
    // magnitude of velocity
    brainInputs.push(Math.sqrt(
      Math.pow(this.body.velocity.x, 2) +
      Math.pow(this.body.velocity.y, 2))
    );
    // angular velocity
    brainInputs.push(this.body.angularVelocity);
    brainInputs.push(Math.cos(eyeAngle1));
    brainInputs.push(Math.sin(eyeAngle1));
    brainInputs.push(Math.cos(eyeToMouthAngle1));
    brainInputs.push(Math.sin(eyeToMouthAngle1));
    brainInputs.push(Math.cos(eyeAngle2));
    brainInputs.push(Math.sin(eyeAngle2));
    brainInputs.push(Math.cos(eyeToMouthAngle2));
    brainInputs.push(Math.sin(eyeToMouthAngle2));
    // 600 is totally arbitrary, seems to work well based on my limited testing
    brainInputs.push(Math.sqrt(
        Math.pow(bodies1.last().point.x - this.body.position.x, 2) +
        Math.pow(bodies1.last().point.y - this.body.position.y, 2) 
        ) / 600);
    brainInputs.push(Math.sqrt(
        Math.pow(bodies2.last().point.x - this.body.position.x, 2) +
        Math.pow(bodies2.last().point.y - this.body.position.y, 2) 
        ) / 600);
    
    // add numTypes 0s to the end of the array
    for (let i = 0; i < numTypes; ++i) {
      brainInputs.push(0);
    }
    let numInputs = 17;

    switch(bodies1.last().body.label) {
      case brain:
        brainInputs[numInputs - numTypes] = 1;
        break;
      case regular:
        brainInputs[numInputs - numTypes + 1] = 1;
        break;
      case eye:
        brainInputs[numInputs - numTypes + 2] = 1;
        break;
      case mouth:
        brainInputs[numInputs - numTypes + 3] = 1;
        break;
      case wall:
        brainInputs[numInputs - numTypes + 4] = 1;
        break;
      default:
        console.log("this should never happen");
        break;
    }

    for (let i = 0; i < numTypes; ++i) {
      brainInputs.push(0);
    }
    // after we add more zeros the size of our inputs changes
    numInputs = 22;

    switch(bodies2.last().body.label) {
      case brain:
        brainInputs[numInputs - numTypes] = 1;
        break;
      case regular:
        brainInputs[numInputs - numTypes + 1] = 1;
        break;
      case eye:
        brainInputs[numInputs - numTypes + 2] = 1;
        break;
      case mouth:
        brainInputs[numInputs - numTypes + 3] = 1;
        break;
      case wall:
        brainInputs[numInputs - numTypes + 4] = 1;
        break;
      default:
        console.log("this should never happen");
        break;
    }

    return brainInputs;
  }

  getEaten() {
    this.fitness -= 30;
  }

  nextMovement() {
    const bodies1 = this.getRaycast(this.eyeIndex1);
    const bodies2 = this.getRaycast(this.eyeIndex2);
    if (bodies1 === [] || bodies1 === undefined) {
      return;
    }

    const brainInputs = this.getBrainInputs(bodies1, bodies2);

    if (brainInputs === undefined || brainInputs.length !== 22) return;
    
    const brainOutputs = this.organismBrain.activate(brainInputs);
    
    const forceX = brainOutputs[0] / 200;
    const forceY = brainOutputs[1] / 200
    const torque = brainOutputs[2] / 400;

    Body.applyForce(this.body, this.body.position, {
      x: forceX, 
      y: forceY
    });
    Body.setVelocity(this.body, {
      x: this.body.velocity.x > .1 ? .1 : this.body.velocity.x,
      y: this.body.velocity.y > .1 ? .1 : this.body.velocity.y,
    });
    Body.setVelocity(this.body, {
      x: this.body.velocity.x < -.1 ? -.1 : this.body.velocity.x,
      y: this.body.velocity.y < -.1 ? -.1 : this.body.velocity.y,
    });

    if (this.body.angularVelocity > .05 && torque > 0 ||
      this.body.angularVelocity < -.05 && torque < 0) {
      return;
    }

    this.body.torque += torque;
  }

  setMutationRates(brainMutationRate, bodyMutationRate) {
    this.brainMutationRate = brainMutationRate;
    this.bodyMutationRate = bodyMutationRate;
  }
}