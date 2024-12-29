class SnakeGame {
    constructor() {
        // 添加难度配置
        this.difficulties = {
            easy: {
                initialSpeed: 200,
                minSpeed: 100,
                speedIncrease: 5,
                scorePerFood: 10
            },
            normal: {
                initialSpeed: 150,
                minSpeed: 70,
                speedIncrease: 8,
                scorePerFood: 15
            },
            hard: {
                initialSpeed: 120,
                minSpeed: 50,
                speedIncrease: 10,
                scorePerFood: 20
            }
        };

        // 添加食物配置
        this.foodConfig = {
            normal: {
                score: 10,
                size: 1
            },
            big: {
                score: 40,
                size: 2,
                duration: {
                    easy: 10000,
                    normal: 8000,
                    hard: 5000
                },
                spawnInterval: 10,
                blinkStart: 2000,
                blinkSpeed: 200
            }
        };

        // 添加障碍物配置
        this.obstacleConfig = {
            count: {
                easy: 3,
                normal: 5,
                hard: 7
            },
            color: '#FFD700',  // 金色
            lineColor: '#B8860B'  // 深金色，用于对角线
        };

        // 添加死亡消息配置
        this.deathMessages = {
            self: {
                bad: [
                    "自己好吃吗？",
                    "这都能撞到自己？",
                    "小垃圾"
                ],
                good: [
                    "有的蛇死了……",
                    "蛇固有一死……",
                    "蛇之常情",
                    "你已经很棒了"
                ],
                excellent: [
                    "撑死了……",
                    "苹果吃多了，吃点蛇肉换换口味",
                    "UNBELIEVABLE!!!"
                ]
            },
            obstacle: {
                bad: [
                    "这没有苹果",
                    "这都能撞死？",
                    "小垃圾"
                ],
                good: [
                    "有的蛇死了……",
                    "蛇固有一死……",
                    "蛇之常情",
                    "你已经很棒了"
                ],
                excellent: [
                    "撑死了……",
                    "苹果吃多了，吃点蛇肉换换口味",
                    "UNBELIEVABLE!!!"
                ]
            }
        };

        this.config = {
            gridSize: 20,
            snakeColor: '#4CAF50',
            foodColor: '#ff0000',
            initialSnakeLength: 4,
            deathAnimationDuration: 1500,
            deathAnimationFrames: 30,
            deathColor: '#ff0000',
            deathParticles: 20,
            particleSpeed: 5,
            wallColor: '#333333'
        };

        // 修改最高分初始化
        this.highScores = {
            easy: parseInt(localStorage.getItem('snakeHighScore_easy')) || 0,
            normal: parseInt(localStorage.getItem('snakeHighScore_normal')) || 0,
            hard: parseInt(localStorage.getItem('snakeHighScore_hard')) || 0
        };
        
        // 默认难度为普通
        this.currentDifficulty = 'normal';
        
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.aspectRatio = 9/16;
        this.resizeCanvas();
        this.gridSize = Math.floor(this.canvas.width / this.config.gridSize);
        
        // 设置初始状态
        this.gameInterval = null;
        this.isPaused = false;
        this.score = 0;
        this.snake = [];
        this.food = null;
        this.direction = 'right';
        
        // 绑定控制和按钮
        this.bindControls();
        this.setupButtons();
        this.updateHighScore();
        
        // 初始化各种状态
        this.initializeStates();
    }

    initializeStates() {
        // 初始化死亡状态
        this.deathState = {
            isAnimating: false,
            cause: null,
            position: null,
            frameCount: 0,
            particles: []
        };

        // 初始化大食物状态
        this.bigFoodState = {
            food: null,
            timer: null,
            blinkTimer: null,
            isVisible: true,
            remainingTime: 0
        };

        // 初始化食物计数器
        this.foodCount = 0;
        
        // 初始化障碍物数组
        this.obstacles = [];
    }

    initializeGame() {
        // 清除任何现有的游戏循环
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }

        // 重置所有游戏状态
        this.initializeSnake();
        this.direction = 'right';
        this.generateObstacles();
        this.food = this.generateFood();
        this.score = 0;
        this.speed = this.difficulties[this.currentDifficulty].initialSpeed;
        this.isPaused = false;

        // 重置死亡状态
        this.deathState = {
            isAnimating: false,
            cause: null,
            position: null,
            frameCount: 0,
            particles: []
        };

        // 重置大食物状态
        this.removeBigFood();
        this.foodCount = 0;
    }

    initializeSnake() {
        this.snake = Array.from({length: this.config.initialSnakeLength}, (_, i) => ({
            x: 5 - i,
            y: 5
        }));
    }

    generateFood() {
        const maxX = Math.floor(this.canvas.width / this.gridSize);
        const maxY = Math.floor(this.canvas.height / this.gridSize);
        let food;
        do {
            food = {
                x: Math.floor(Math.random() * maxX),
                y: Math.floor(Math.random() * maxY)
            };
        } while (this.isPositionOccupied(food) || this.isBigFoodOverlap(food));
        return food;
    }

    generateBigFood() {
        const maxX = Math.floor(this.canvas.width / this.gridSize) - 1;
        const maxY = Math.floor(this.canvas.height / this.gridSize) - 1;
        let food;
        do {
            food = {
                x: Math.floor(Math.random() * maxX),
                y: Math.floor(Math.random() * maxY)
            };
        } while (this.isBigFoodCollision(food));
        return food;
    }

    isPositionOccupied(pos) {
        // 检查是否与蛇身重叠
        const snakeCollision = this.snake.some(segment => 
            segment.x === pos.x && segment.y === pos.y
        );
        
        // 检查是否与障碍物重叠
        const obstacleCollision = this.obstacles.some(obstacle => 
            obstacle.x === pos.x && obstacle.y === pos.y
        );
        
        return snakeCollision || obstacleCollision;
    }

    isBigFoodCollision(pos) {
        // 检查2x2区域是否有碰撞
        for (let x = pos.x; x < pos.x + 2; x++) {
            for (let y = pos.y; y < pos.y + 2; y++) {
                if (this.isPositionOccupied({x, y})) return true;
            }
        }
        return false;
    }

    isBigFoodOverlap(pos) {
        if (!this.bigFood) return false;
        return pos.x >= this.bigFood.x && pos.x < this.bigFood.x + 2 &&
               pos.y >= this.bigFood.y && pos.y < this.bigFood.y + 2;
    }

    bindControls() {
        document.addEventListener('keydown', (e) => {
            if (this.isPaused) return;
            
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.direction !== 'down') this.direction = 'up';
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.direction !== 'up') this.direction = 'down';
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.direction !== 'right') this.direction = 'left';
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.direction !== 'left') this.direction = 'right';
                    break;
            }
        });
    }

    setupButtons() {
        document.getElementById('startBtn').addEventListener('click', () => {
            document.getElementById('mainMenu').classList.add('hidden');
            document.getElementById('difficultyMenu').classList.remove('hidden');
        });

        document.getElementById('easyBtn').addEventListener('click', () => {
            this.setDifficulty('easy');
        });

        document.getElementById('normalBtn').addEventListener('click', () => {
            this.setDifficulty('normal');
        });

        document.getElementById('hardBtn').addEventListener('click', () => {
            this.setDifficulty('hard');
        });

        document.getElementById('backToMainBtn').addEventListener('click', () => {
            document.getElementById('difficultyMenu').classList.add('hidden');
            document.getElementById('mainMenu').classList.remove('hidden');
        });

        document.getElementById('pauseBtn').addEventListener('click', () => this.showPauseMenu());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('exitBtn').addEventListener('click', () => this.exitGame());
        document.getElementById('resumeBtn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restartFromPauseBtn').addEventListener('click', () => this.restartFromPause());
        document.getElementById('exitToPauseBtn').addEventListener('click', () => this.exitToMainMenu());

        // 修改重置最高分按钮事件
        document.getElementById('resetHighScoreBtn').addEventListener('click', () => {
            // 重置复选框状态为全选
            document.getElementById('resetEasy').checked = true;
            document.getElementById('resetNormal').checked = true;
            document.getElementById('resetHard').checked = true;
            document.getElementById('confirmModal').classList.remove('hidden');
        });

        // 添加确认重置按钮事件
        document.getElementById('confirmResetBtn').addEventListener('click', () => {
            const hasSelection = document.getElementById('resetEasy').checked ||
                               document.getElementById('resetNormal').checked ||
                               document.getElementById('resetHard').checked;
            
            if (hasSelection) {
                this.resetHighScore();
                document.getElementById('confirmModal').classList.add('hidden');
                document.getElementById('successModal').classList.remove('hidden');
            } else {
                alert('请至少选择一个难度');
            }
        });

        // 添加成功确认按钮事件
        document.getElementById('successOkBtn').addEventListener('click', () => {
            document.getElementById('successModal').classList.add('hidden');
        });

        // 添加取消重置按钮事件
        document.getElementById('cancelResetBtn').addEventListener('click', () => {
            document.getElementById('confirmModal').classList.add('hidden');
        });

        // 添加教程按钮事件
        document.getElementById('tutorialBtn').addEventListener('click', () => {
            document.getElementById('tutorialModal').classList.remove('hidden');
        });

        // 添加关闭教程按钮事件
        document.getElementById('closeTutorialBtn').addEventListener('click', () => {
            document.getElementById('tutorialModal').classList.add('hidden');
        });

        // 添加移动控制按钮事件
        document.getElementById('upBtn').addEventListener('click', () => {
            if (!this.isPaused && this.direction !== 'down') {
                this.direction = 'up';
            }
        });

        document.getElementById('downBtn').addEventListener('click', () => {
            if (!this.isPaused && this.direction !== 'up') {
                this.direction = 'down';
            }
        });

        document.getElementById('leftBtn').addEventListener('click', () => {
            if (!this.isPaused && this.direction !== 'right') {
                this.direction = 'left';
            }
        });

        document.getElementById('rightBtn').addEventListener('click', () => {
            if (!this.isPaused && this.direction !== 'left') {
                this.direction = 'right';
            }
        });
    }

    setDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        const difficultyConfig = this.difficulties[difficulty];
        
        this.updateHighScore();
        
        this.speed = difficultyConfig.initialSpeed;
        this.config.minSpeed = difficultyConfig.minSpeed;
        this.config.speedIncrease = difficultyConfig.speedIncrease;
        this.config.scorePerFood = difficultyConfig.scorePerFood;

        this.initializeGame();

        // 更新界面
        document.getElementById('difficultyMenu').classList.add('hidden');
        document.getElementById('gameCanvas').classList.remove('hidden');
        document.querySelector('.game-header').classList.remove('hidden');
        
        // 在所有设备上显示控制按钮
        document.querySelector('.mobile-controls').classList.remove('hidden');
        
        this.startGame();
    }

    startGame() {
        // 确保清除任何现有的游戏循环
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }

        // 重置游戏状态
        this.score = 0;
        document.getElementById('score').textContent = '0';
        
        // 确保界面状态正确
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('pauseMenu').classList.add('hidden');
        document.getElementById('pauseBtn').textContent = '暂停';
        this.isPaused = false;

        // 启动新的游戏循环
        this.gameInterval = setInterval(() => {
            if (!this.isPaused) {
                this.update();
                this.draw();
            }
        }, this.speed);
    }

    update() {
        const head = {...this.snake[0]};
        
        // 更新头部位置
        switch(this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // 处理边界穿越
        const maxX = Math.floor(this.canvas.width / this.gridSize);
        const maxY = Math.floor(this.canvas.height / this.gridSize);
        
        // 水平穿越
        if (head.x < 0) {
            head.x = maxX - 1;
        } else if (head.x >= maxX) {
            head.x = 0;
        }
        
        // 垂直穿越
        if (head.y < 0) {
            head.y = maxY - 1;
        } else if (head.y >= maxY) {
            head.y = 0;
        }

        // 检查碰撞（包括障碍物和自身）
        if (this.checkCollision(head)) {
            this.gameOver();
            return;
        }

        this.snake.unshift(head);

        // 检查是否吃到食物
        let ate = false;

        // 检查是否吃到大食物
        if (this.bigFoodState.food && 
            head.x >= this.bigFoodState.food.x && 
            head.x <= this.bigFoodState.food.x + 1 && 
            head.y >= this.bigFoodState.food.y && 
            head.y <= this.bigFoodState.food.y + 1) {
            this.score += this.foodConfig.big.score;
            this.removeBigFood();
            ate = true;
        }
        
        // 检查是否吃到普通食物
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += this.foodConfig.normal.score;
            this.foodCount++;
            this.food = this.generateFood();
            
            // 每吃10个食物生成一个大食物
            if (this.foodCount % this.foodConfig.big.spawnInterval === 0) {
                this.spawnBigFood();
            }
            ate = true;
        }

        // 如果没吃到食物，移除蛇尾
        if (!ate) {
            this.snake.pop();
        }

        // 更新分数显示
        document.getElementById('score').textContent = this.score;
    }

    handleFoodCollision() {
        // 移除这个方法，因为已经在update中处理了食物碰撞
    }

    spawnBigFood() {
        if (this.bigFoodState.timer) {
            clearTimeout(this.bigFoodState.timer);
        }
        if (this.bigFoodState.blinkTimer) {
            clearInterval(this.bigFoodState.blinkTimer);
        }
        
        const duration = this.foodConfig.big.duration[this.currentDifficulty];
        
        this.bigFoodState = {
            food: this.generateBigFood(),
            timer: null,
            blinkTimer: null,
            isVisible: true,
            remainingTime: duration
        };
        
        // 设置消失计时器
        this.bigFoodState.timer = setTimeout(() => {
            this.removeBigFood();
        }, duration);
        
        // 设置闪烁计时器
        setTimeout(() => {
            this.startBigFoodBlinking();
        }, duration - this.foodConfig.big.blinkStart);
    }

    startBigFoodBlinking() {
        this.bigFoodState.blinkTimer = setInterval(() => {
            this.bigFoodState.isVisible = !this.bigFoodState.isVisible;
        }, this.foodConfig.big.blinkSpeed);
    }

    removeBigFood() {
        if (this.bigFoodState.timer) {
            clearTimeout(this.bigFoodState.timer);
        }
        if (this.bigFoodState.blinkTimer) {
            clearInterval(this.bigFoodState.blinkTimer);
        }
        this.bigFoodState = {
            food: null,
            timer: null,
            blinkTimer: null,
            isVisible: true,
            remainingTime: 0
        };
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格线
        this.drawGrid();
        
        // 绘制障碍物
        this.ctx.fillStyle = this.obstacleConfig.color;
        this.obstacles.forEach(obstacle => {
            this.drawSegment(obstacle, 1);
        });

        // 在死亡动画期间逐渐淡出蛇和食物
        if (this.deathState.isAnimating) {
            const alpha = 1 - (this.deathState.frameCount / this.config.deathAnimationFrames);
            
            // 绘制蛇（带透明度）
            this.ctx.fillStyle = `rgba(76, 175, 80, ${alpha})`;
            this.snake.forEach(segment => {
                this.drawSegment(segment, 1);
            });

            // 绘制食物（带透明度）
            this.ctx.fillStyle = `rgba(233, 30, 99, ${alpha})`;
            this.drawFood(this.food);
        } else {
            // 正常绘制
            this.ctx.fillStyle = this.config.snakeColor;
            this.snake.forEach(segment => {
                this.drawSegment(segment, 1);
            });

            this.ctx.fillStyle = this.config.foodColor;
            this.drawFood(this.food);
        }

        // 绘制大食物
        if (this.bigFoodState.food && this.bigFoodState.isVisible) {
            this.ctx.fillStyle = '#ff9800';
            this.drawBigFood(this.bigFoodState.food);
        }
    }

    drawSegment(pos, size = 1) {
        // 果是障碍物，绘制带对角线的方块
        if (this.obstacles.some(obs => obs.x === pos.x && obs.y === pos.y)) {
            // 绘制底色
            this.ctx.fillStyle = this.obstacleConfig.color;
            this.ctx.fillRect(
                pos.x * this.gridSize,
                pos.y * this.gridSize,
                this.gridSize * size - 1,
                this.gridSize * size - 1
            );

            // 绘制对角线
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.obstacleConfig.lineColor;
            this.ctx.lineWidth = 2;
            
            // 左上到右下的对角线
            this.ctx.moveTo(pos.x * this.gridSize, pos.y * this.gridSize);
            this.ctx.lineTo(
                (pos.x + size) * this.gridSize - 1,
                (pos.y + size) * this.gridSize - 1
            );
            
            // 右上到左下的对角线
            this.ctx.moveTo((pos.x + size) * this.gridSize - 1, pos.y * this.gridSize);
            this.ctx.lineTo(
                pos.x * this.gridSize,
                (pos.y + size) * this.gridSize - 1
            );
            
            this.ctx.stroke();
        } else {
            // 普通方块的绘制保持不变
            this.ctx.fillRect(
                pos.x * this.gridSize,
                pos.y * this.gridSize,
                this.gridSize * size - 1,
                this.gridSize * size - 1
            );
        }
    }

    drawFood(pos) {
        const x = (pos.x + 0.5) * this.gridSize;
        const y = (pos.y + 0.5) * this.gridSize;
        const radius = (this.gridSize - 1) / 2;

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawBigFood(pos) {
        const x = (pos.x + 1) * this.gridSize;
        const y = (pos.y + 1) * this.gridSize;
        const radius = this.gridSize - 1;

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    checkCollision(head) {
        // 检查障碍物碰撞
        const obstacleCollision = this.obstacles.some(obstacle => {
            if (obstacle.x === head.x && obstacle.y === head.y) {
                this.deathState.cause = 'obstacle';
                this.deathState.position = head;  // 使用碰撞位置
                return true;
            }
            return false;
        });

        if (obstacleCollision) return true;

        // 检查自身碰撞
        return this.checkSelfCollision(head);
    }

    checkSelfCollision(head) {
        const selfCollision = this.snake.some((segment, index) => {
            if (index === 0) return false;
            if (segment.x === head.x && segment.y === head.y) {
                this.deathState.cause = 'self';
                this.deathState.position = segment;
                return true;
            }
            return false;
        });

        return selfCollision;
    }

    gameOver() {
        clearInterval(this.gameInterval);
        this.gameInterval = null;
        
        // 更新当前难度的最高分
        if (this.score > this.highScores[this.currentDifficulty]) {
            this.highScores[this.currentDifficulty] = this.score;
            localStorage.setItem(`snakeHighScore_${this.currentDifficulty}`, this.score);
            this.updateHighScore();
        }

        document.querySelector('.mobile-controls').classList.add('hidden');
        
        // 设置死亡动画状态
        this.deathState.isAnimating = true;
        this.deathState.frameCount = 0;

        // 开始死亡动画
        this.startDeathAnimation();
    }

    startDeathAnimation() {
        // 生成粒子
        this.generateDeathParticles();
        
        const frameInterval = this.config.deathAnimationDuration / this.config.deathAnimationFrames;
        const animationInterval = setInterval(() => {
            this.deathState.frameCount++;
            this.updateParticles();
            this.draw();
            this.drawDeathAnimation();

            if (this.deathState.frameCount >= this.config.deathAnimationFrames) {
                clearInterval(animationInterval);
                this.showGameOverScreen();
            }
        }, frameInterval);
    }

    generateDeathParticles() {
        const deathPos = this.snake[0];  // 使用蛇头位置作为爆炸中心
        
        this.deathState.particles = Array.from({length: this.config.deathParticles}, () => ({
            x: (deathPos.x + 0.5) * this.gridSize,
            y: (deathPos.y + 0.5) * this.gridSize,
            angle: Math.random() * Math.PI * 2,
            speed: Math.random() * this.config.particleSpeed + 2,
            size: Math.random() * this.gridSize * 0.8 + this.gridSize * 0.2,
            alpha: 1,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2
        }));
    }

    updateParticles() {
        const progress = this.deathState.frameCount / this.config.deathAnimationFrames;
        
        this.deathState.particles.forEach(particle => {
            // 更新位置
            particle.x += Math.cos(particle.angle) * particle.speed;
            particle.y += Math.sin(particle.angle) * particle.speed;
            
            // 更新透明度
            particle.alpha = 1 - progress;
            
            // 更新旋转
            particle.rotation += particle.rotationSpeed;
            
            // 减缓速度
            particle.speed *= 0.95;
        });
    }

    drawDeathAnimation() {
        // 绘制死亡动画效果
        this.ctx.save();
        
        // 绘制粒子
        this.deathState.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation);
            
            // 设置颜色和透明度
            this.ctx.fillStyle = `rgba(255, 0, 0, ${particle.alpha})`;
            
            // 绘制粒子（方块形状）
            this.ctx.fillRect(
                -particle.size / 2,
                -particle.size / 2,
                particle.size,
                particle.size
            );
            
            this.ctx.restore();
        });

        // 绘制波纹效果
        const progress = this.deathState.frameCount / this.config.deathAnimationFrames;
        const center = {
            x: (this.snake[0].x + 0.5) * this.gridSize,
            y: (this.snake[0].y + 0.5) * this.gridSize
        };
        
        const maxRadius = this.canvas.width * 0.4;
        const radius = maxRadius * progress;
        const alpha = 1 - progress;

        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // 如果是障碍物碰撞，添加特殊的碰撞效果
        if (this.deathState.cause === 'obstacle') {
            const pos = this.deathState.position;
            const progress = this.deathState.frameCount / this.config.deathAnimationFrames;
            
            // 添加碰撞波纹效果
            this.ctx.beginPath();
            this.ctx.arc(
                (pos.x + 0.5) * this.gridSize,
                (pos.y + 0.5) * this.gridSize,
                this.gridSize * (1 + progress * 2),
                0,
                Math.PI * 2
            );
            this.ctx.strokeStyle = `rgba(255, 0, 0, ${1 - progress})`;
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawWallCollision() {
        const pos = this.deathState.position;
        const progress = this.deathState.frameCount / this.config.deathAnimationFrames;
        const size = this.gridSize * (1 + progress);
        
        this.ctx.fillStyle = `rgba(255, 0, 0, ${1 - progress})`;
        this.ctx.beginPath();
        this.ctx.arc(
            pos.x * this.gridSize + this.gridSize / 2,
            pos.y * this.gridSize + this.gridSize / 2,
            size / 2,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
    }

    showGameOverScreen() {
        let messageType;
        if (this.score <= 100) {
            messageType = 'bad';
        } else if (this.score <= 200) {
            messageType = 'good';
        } else {
            messageType = 'excellent';
        }

        const messages = this.deathMessages[this.deathState.cause][messageType];
        const message = this.getRandomMessage(messages);
        const cause = this.deathState.cause === 'obstacle' ? '撞到障碍物' : '咬到自己';

        document.getElementById('gameOverMessage').textContent = `${cause}：${message}`;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').classList.remove('hidden');
    }

    getRandomMessage(messages) {
        const index = Math.floor(Math.random() * messages.length);
        return messages[index];
    }

    updateHighScore() {
        // 更新所有难度的最高分显示
        document.getElementById('highScoreEasy').textContent = this.highScores.easy;
        document.getElementById('highScoreNormal').textContent = this.highScores.normal;
        document.getElementById('highScoreHard').textContent = this.highScores.hard;
    }

    showPauseMenu() {
        if (!this.gameInterval) return;
        this.isPaused = true;
        document.getElementById('pauseBtn').textContent = '继续';
        document.getElementById('pauseMenu').classList.remove('hidden');
    }

    resumeGame() {
        this.isPaused = false;
        document.getElementById('pauseBtn').textContent = '暂停';
        document.getElementById('pauseMenu').classList.add('hidden');
    }

    restartGame() {
        // 重置死亡状态
        this.deathState = {
            isAnimating: false,
            cause: null,
            position: null,
            frameCount: 0,
            particles: []
        };
        
        // 重新初始化游戏状态
        this.initializeSnake();
        this.direction = 'right';
        this.score = 0;
        document.getElementById('score').textContent = '0';
        
        // 重新生成障碍物
        this.generateObstacles();
        
        // 生成新的食物
        this.food = this.generateFood();
        
        // 重置大食物状态
        this.removeBigFood();
        this.foodCount = 0;
        
        // 启动游戏
        this.startGame();
    }

    restartFromPause() {
        document.getElementById('pauseMenu').classList.add('hidden');
        this.restartGame();
    }

    exitToMainMenu() {
        this.isPaused = false;
        document.getElementById('pauseMenu').classList.add('hidden');
        document.getElementById('pauseBtn').textContent = '暂停';
        this.exitGame();
    }

    exitGame() {
        clearInterval(this.gameInterval);
        this.gameInterval = null;
        
        // 重置所有游戏状态
        this.initializeGame();
        
        // 重置死亡状态
        this.deathState = {
            isAnimating: false,
            cause: null,
            position: null,
            frameCount: 0,
            particles: []
        };
        
        // 重置速度
        this.speed = this.difficulties[this.currentDifficulty].initialSpeed;
        
        // 重置界面显示
        document.getElementById('score').textContent = '0';
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('gameCanvas').classList.add('hidden');
        document.querySelector('.game-header').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
        document.querySelector('.mobile-controls').classList.add('hidden');
        
        // 清除画布内容，避免网格显示
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 确保清理大食物状态
        this.removeBigFood();
    }

    resizeCanvas() {
        const container = document.querySelector('.game-container');
        const maxWidth = container.clientWidth * 0.8;
        const maxHeight = window.innerHeight * 0.6;

        let width = maxWidth;
        let height = width / this.aspectRatio;

        if (height > maxHeight) {
            height = maxHeight;
            width = height * this.aspectRatio;
        }

        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
    }

    resetHighScore() {
        // 获取选中的难度
        const resetEasy = document.getElementById('resetEasy').checked;
        const resetNormal = document.getElementById('resetNormal').checked;
        const resetHard = document.getElementById('resetHard').checked;

        // 重置选中难度的最高分
        if (resetEasy) {
            this.highScores.easy = 0;
            localStorage.removeItem('snakeHighScore_easy');
        }
        if (resetNormal) {
            this.highScores.normal = 0;
            localStorage.removeItem('snakeHighScore_normal');
        }
        if (resetHard) {
            this.highScores.hard = 0;
            localStorage.removeItem('snakeHighScore_hard');
        }

        this.updateHighScore();
    }

    generateObstacles() {
        this.obstacles = [];
        const obstacleCount = this.obstacleConfig.count[this.currentDifficulty];
        const maxX = Math.floor(this.canvas.width / this.gridSize);
        const maxY = Math.floor(this.canvas.height / this.gridSize);
        
        // 创建安全区域（蛇的初始位置）
        const safeZone = {
            minX: 2,
            maxX: 7,
            minY: 3,
            maxY: 7
        };

        for (let i = 0; i < obstacleCount; i++) {
            let obstacle;
            do {
                obstacle = {
                    x: Math.floor(Math.random() * maxX),
                    y: Math.floor(Math.random() * maxY)
                };
            } while (
                this.isPositionOccupied(obstacle) || 
                this.isInSafeZone(obstacle, safeZone) ||
                this.isNearObstacle(obstacle) ||
                this.isBigFoodOverlap(obstacle)
            );
            this.obstacles.push(obstacle);
        }
    }

    isInSafeZone(pos, safeZone) {
        return pos.x >= safeZone.minX && pos.x <= safeZone.maxX &&
               pos.y >= safeZone.minY && pos.y <= safeZone.maxY;
    }

    isNearObstacle(pos) {
        // 确保障碍物之间有一定距离
        return this.obstacles.some(obs => 
            Math.abs(obs.x - pos.x) < 2 && Math.abs(obs.y - pos.y) < 2
        );
    }

    // 添加绘制网格的方法
    drawGrid() {
        const maxX = Math.floor(this.canvas.width / this.gridSize);
        const maxY = Math.floor(this.canvas.height / this.gridSize);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';  // 半透明白色
        this.ctx.lineWidth = 1;
        
        // 绘制垂直线
        for (let x = 0; x <= maxX; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.gridSize, 0);
            this.ctx.lineTo(x * this.gridSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        // 绘制水平线
        for (let y = 0; y <= maxY; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.gridSize);
            this.ctx.lineTo(this.canvas.width, y * this.gridSize);
            this.ctx.stroke();
        }
        
        // 绘制边界
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';  // 更明显的边界线
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// 创建游戏实例
window.onload = () => {
    new SnakeGame();
}; 