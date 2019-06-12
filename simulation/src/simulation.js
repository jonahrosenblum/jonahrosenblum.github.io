class Simulation {
  constructor() {
    this.runner;
    this.render;
    this.coevolutionPop;
    this.numAppendages;;
    this.counter = 0;
    // variables that the user can change
    this.numAppendages = 8;
    this.popSize = 12;
    this.brainMutationRate = .05;
    this.bodyMutationRate = .05;
    this.reset = false;
    this.passOnMutation = false;
    // buttons and sliders
    this.popSizeSlider = document.getElementById("popSizeSlider");
    this.appendagesSlider = document.getElementById("numAppendagesSlider");
    this.brainMutationInput = document.getElementById("brainMutationRate");
    this.bodyMutationInput = document.getElementById("bodyMutationRate");
    this.slowDownButton = document.getElementById("slowDownButton");
    this.heritageToggle = document.getElementById("heritageToggle");
    this.speedUpButton = document.getElementById("speedUpButton");
    this.runButton = document.getElementById("simulationRunner");
    this.currentSpeed = 0;
    this.intervals = [];
  }

  addEvents() {
    Events.on(engine, 'collisionStart', (event) => {
      let pairs = event.pairs;
      for (let i = 0, j = pairs.length; i != j; ++i) {
          let pair = pairs[i];
          if ((!has(this.coevolutionPop.pop, pair.bodyA.parent.id) && pair.bodyA.label != WALL) ||
              (!has(this.coevolutionPop.pop, pair.bodyB.parent.id) && pair.bodyB.label != WALL)) {
            continue;
          }

          if (pair.bodyA.label === MOUTH && pair.bodyB.label === BRAIN) {
            World.remove(engine.world, pair.bodyB.parent);
            this.coevolutionPop.pop[pair.bodyA.parent.id].eatBrain();
            this.coevolutionPop.replaceOrganism(pair.bodyB.parent.id);
          } else if (pair.bodyB.label === MOUTH && pair.bodyA.label === BRAIN) {
            World.remove(engine.world, pair.bodyA.parent);
            this.coevolutionPop.pop[pair.bodyB.parent.id].eatBrain();
            this.coevolutionPop.replaceOrganism(pair.bodyA.parent.id);
          } else if (pair.bodyB.label === WALL) {
            World.remove(engine.world, pair.bodyA.parent);
            this.coevolutionPop.replaceOrganism(pair.bodyA.parent.id);
          } else if (pair.bodyA.label === WALL) {
            World.remove(engine.world, pair.bodyB.parent);
            this.coevolutionPop.replaceOrganism(pair.bodyB.parent.id);
          }
      }
    });
  
    this.counter = 0;
  
    Events.on(engine, 'beforeUpdate', () => {
      if (!this.coevolutionPop || !this.coevolutionPop.pop) return;
      // if we do a raycast before every update this simulation lags, this helps space it out
      if (this.counter % 5 === 0) {
        Object.values(this.coevolutionPop.pop).forEach((organism) => {
          if (this.coevolutionPop) {
            organism.nextMovement();
            organism.survivalBonus();
          }
        });
      }
      
      // 1000 updates per generation is very arbitrary, it's just a way to measure time passing
      if (this.counter % 1000 === 0) {
        document.getElementById("gen").innerHTML = "Generation: {0}".format(this.counter / 1000);
        const degen = degeneration(this.counter / 1000) + .1;
        // over time the amount that mutations change should decrease
        neataptic.methods.mutation.MOD_WEIGHT.min = -degen;
        neataptic.methods.mutation.MOD_WEIGHT.max = degen;
        neataptic.methods.mutation.MOD_BIAS.min = -degen;
        neataptic.methods.mutation.MOD_BIAS.max = degen;
      }
      this.counter += 1;
    });
  
    Events.on(this.runner, "afterTick", () => {
      if (this.reset) {
        engine.events = {}
        this.runner.events = {}
        World.clear(engine.world);
        Engine.clear(engine);
        Runner.stop(this.runner);
        Render.stop(this.render);
        return;
      }
    });
  }

  configureButtons() {
    this.runButton.addEventListener('click', () =>{
      this.reset = true;
      setTimeout(() => { 
        this.reset = false;
        simulation.runSimulation(this.numAppendages, this.popSize, this.brainMutationRate, this.bodyMutationRate, this.passOnMutation); 
      }, 100);
    });
    
    this.appendagesSlider.addEventListener('click', () => {
      this.numAppendages = Number(this.appendagesSlider.value);
      document.getElementById("appenValue").innerHTML = "Current value: {0}".format(this.numAppendages);
    });
    
    this.popSizeSlider.addEventListener('click', () => {
      this.popSize = Number(this.popSizeSlider.value);
      document.getElementById("popSize").innerHTML = "Current value: {0}".format(this.popSize);
    });
    
    this.brainMutationInput.addEventListener('input', () => {
      const newMutation = this.brainMutationInput.value;
      if (newMutation > 1 || newMutation < 0) {
        this.brainMutationRate = .05;
        this.brainMutationInput.value = .05;
      }
      this.brainMutationRate = Number(this.brainMutationInput.value);
    });
    
    this.bodyMutationInput.addEventListener('input', () => {
      const newMutation = this.bodyMutationInput.value;
      if (newMutation > 1 || newMutation < 0) {
        this.bodyMutationRate = .05;
        this.bodyMutationInput.value = .05;
      }
      this.bodyMutationRate = Number(this.bodyMutationInput.value);
    });
     
    this.heritageToggle.addEventListener('click', () => {
      this.passOnMutation = !this.passOnMutation;
    });
    
    this.speedUpButton.addEventListener('click', () => {
      this.intervals.push(setInterval(() => Matter.Engine.update(engine, 1000 / 60), 1000 / 60));
      this.currentSpeed += (this.currentSpeed > 29) ? 0 : 1;
      document.getElementById("currentSpeed").innerHTML = "Current speed: {0}".format(this.currentSpeed);
    });

    this.slowDownButton.addEventListener('click', () => {
      this.intervals.forEach((interval) => clearInterval(interval));
      this.currentSpeed = 0;
      document.getElementById("currentSpeed").innerHTML = "Current speed: {0}".format(this.currentSpeed);
    });
  }

  runSimulation(numAppendages, popSize, brainMutationRate, bodyMutationRate, mutationRateHeritage) {

    engine = Engine.create();
    //engine.world = engine.world;
  
    engine.world.gravity.y = 0;
    this.render = Render.create({
      element: document.body,
      engine: engine,
      canvas: document.getElementById('.simulation'),
      options: {
        width: Math.min(document.documentElement.clientWidth, 1200),
        height: Math.min(document.documentElement.clientHeight, 700),
        wireframes: false,
        showCollisions: false,
      }
    });
    
  
    Matter.Render.run(this.render);
    this.runner = Runner.create();
    Runner.run(this.runner, engine);
  
    this.coevolutionPop = new Population(popSize, numAppendages, brainMutationRate, bodyMutationRate, mutationRateHeritage);
    this.coevolutionPop.generatePop();
    this.coevolutionPop.addGenerationToWorld();
    this.addEvents(engine, this.coevolutionPop);
  }

}

// run the simulation with the default values
const simulation = new Simulation();
simulation.configureButtons();
simulation.runSimulation(8, 12, .05, .05, false);