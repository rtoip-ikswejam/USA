document.addEventListener('DOMContentLoaded', () => {
    const gameWrapper = document.getElementById('game-wrapper');
    const gameContainer = document.getElementById('game-container');
    const sky = document.getElementById('sky');
    const waterElement = document.getElementById('water');
    const scoreElement = document.getElementById('score');
    const gameOverScreen = document.getElementById('game-over');
    const gameOverMessage = document.getElementById('game-over-message');
    const restartButton = document.getElementById('restart-button');
    const ground = document.getElementById('ground');
    const barn = document.getElementById('barn');
    const waterLevelBar = document.getElementById('water-level-bar');
    const barText = document.getElementById('bar-text');

    // --- Zmienne gry ---
    // Poziom wody w zakresie 0-100%, gdzie 100% to pełne zanurzenie stodoły
    let waterLevel = 0;
    const maxWaterLevelDisplay = 100; // Maksymalna wartość wyświetlana na pasku

    // Konfiguracja wysokości elementów w procentach wysokości game-container
    const groundHeightPercentage = 10;
    const barnTotalHeightPercentage = 30; // Stodoła ma 30% wysokości game-container
    const barnBaseLevelPercentage = groundHeightPercentage; // Stodoła stoi na trawie
    const barnTopLevelPercentageAbsolute = barnBaseLevelPercentage + barnTotalHeightPercentage; // Szczyt stodoły w % game-container (40%)

    // Chmury mają się pojawiać między 20% a 60% wysokości ekranu, licząc od GÓRY
    const cloudMinTopPercentageFromTop = 20; // 20% od góry ekranu
    const cloudMaxTopPercentageFromTop = 60; // 60% od góry ekranu

    // Woda zaczyna się od 0% (dno ekranu). Jej maksymalna fizyczna wysokość to szczyt stodoły (40% wysokości game-container)
    const absoluteWaterLevelFor100PercentDisplay = barnTopLevelPercentageAbsolute;

    let cloudSpawnInterval = 1000;
    let cloudIntervalId;
    let gameRunning = false;
    let gameStartTime;

    // --- Funkcje gry ---
    function updateWaterLevelDisplay() {
        // Obliczamy faktyczną wysokość wody w game-container na podstawie waterLevel (0-100% zatopienia stodoły)
        const actualWaterHeightPercentage = (waterLevel / maxWaterLevelDisplay) * absoluteWaterLevelFor100PercentDisplay;
        waterElement.style.height = `${actualWaterHeightPercentage}%`;
        scoreElement.textContent = `${Math.round(waterLevel)}%`;
        updateWaterLevelBar();
    }

    function updateWaterLevelBar() {
        if (waterLevel < 25) {
            waterLevelBar.style.backgroundColor = 'green';
            barText.textContent = 'Brak zagrożenia';
            barText.classList.remove('font-dark');
            barText.classList.add('font-light');
        } else if (waterLevel >= 25 && waterLevel < 50) {
            waterLevelBar.style.backgroundColor = 'yellow';
            barText.textContent = 'Stopień 1';
            barText.classList.remove('font-light');
            barText.classList.add('font-dark');
        } else if (waterLevel >= 50 && waterLevel < 75) {
            waterLevelBar.style.backgroundColor = 'orange';
            barText.textContent = 'Stopień 2';
            barText.classList.remove('font-dark');
            barText.classList.add('font-light');
        } else { // waterLevel >= 75
            waterLevelBar.style.backgroundColor = 'red';
            barText.textContent = 'Stopień 3';
            barText.classList.remove('font-dark');
            barText.classList.add('font-light');
        }
    }

    function spawnCloud() {
        if (!gameRunning) return;

        const cloud = document.createElement('img');
        cloud.src = 'cloud.svg';
        cloud.classList.add('cloud');
        const side = Math.random() < 0.5 ? 'left' : 'right';
        cloud.classList.add(side);

        gameContainer.appendChild(cloud);
        // Po dodaniu do DOM, możemy pobrać rzeczywiste wymiary
        const cloudHeight = cloud.offsetHeight;

        const gameContainerHeight = gameContainer.offsetHeight;

        // Oblicz min/max top position w pikselach, bazując na procentach od GÓRY
        const minTopPx = gameContainerHeight * (cloudMinTopPercentageFromTop / 100);
        const maxTopPx = gameContainerHeight * (cloudMaxTopPercentageFromTop / 100);

        // Losowa pozycja pionowa (Y) dla chmury
        // Upewnij się, że cała chmura mieści się w zadanym zakresie (odejmij jej wysokość od maksymalnej dozwolonej pozycji)
        let topPosition = minTopPx + Math.random() * (maxTopPx - minTopPx - cloudHeight);
        
        // Zabezpieczenie przed wyjściem poza zakres
        topPosition = Math.max(minTopPx, Math.min(topPosition, maxTopPx - cloudHeight));
        
        cloud.style.top = `${topPosition}px`;

        const animationDuration = 5 + Math.random() * 5;
        cloud.style.animationDuration = `${animationDuration}s`;

        cloud.dataset.removed = 'false';
        cloud.dataset.waterCheckIntervalId = null;

        cloud.dataset.waterCheckIntervalId = setInterval(() => {
            if (cloud.dataset.removed === 'false' && gameRunning) {
                const cloudRect = cloud.getBoundingClientRect();
                const barnRect = barn.getBoundingClientRect();
                const gameContainerRect = gameContainer.getBoundingClientRect();

                // Pozycje horyzontalne chmury względem gameContainer
                const cloudRelativeLeft = cloudRect.left - gameContainerRect.left;
                const cloudRelativeRight = cloudRect.right - gameContainerRect.left;

                // Pozycje horyzontalne stodoły względem gameContainer
                const barnRelativeLeft = barnRect.left - gameContainerRect.left;
                const barnRelativeRight = barnRect.right - gameContainerRect.left;

                // Sprawdź, czy chmura jest poziomo nad stodołą
                const isOverBarnHorizontally = cloudRelativeRight > barnRelativeLeft && cloudRelativeLeft < barnRelativeRight;

                // Sprawdź, czy chmura jest pionowo nad dachem stodoły
                // (czyli jej dolna krawędź jest powyżej dachu stodoły)
                const cloudBottomRelativePx = cloudRect.bottom - gameContainerRect.top;
                const barnTopRelativePx = barnTopLevelPercentageAbsolute / 100 * gameContainerHeight;
                const isCloudAboveBarnRoof = cloudBottomRelativePx > barnTopRelativePx; 
                
                // Jeśli chmura jest nad stodołą (i poziomo, i pionowo)
                if (isOverBarnHorizontally && isCloudAboveBarnRoof) {
                    const waterPerSecond = (10 / animationDuration); // Woda podniesie się o ok. 10% skali w czasie życia chmury
                    increaseWaterLevel(waterPerSecond * (100 / 1000)); // Przeliczenie na interwał 100ms
                }
            }
        }, 100);

        cloud.addEventListener('click', (event) => {
            if (!gameRunning) return;
            stopCloudWaterCheck(cloud);
            removeCloud(cloud);
            showSun(event);
        });

        cloud.addEventListener('animationend', () => {
            if (cloud.parentElement) {
                stopCloudWaterCheck(cloud);
                cloud.remove();
            }
        });
    }

    function stopCloudWaterCheck(cloud) {
        if (cloud.dataset.waterCheckIntervalId) {
            clearInterval(cloud.dataset.waterCheckIntervalId);
            cloud.dataset.waterCheckIntervalId = null;
        }
    }

    function removeCloud(cloud) {
        cloud.dataset.removed = 'true';
        stopCloudWaterCheck(cloud);
        cloud.remove();
    }

    function showSun(event) {
        const sun = document.createElement('img');
        sun.src = 'sun.svg';
        sun.classList.add('sun');

        const gameContainerRect = gameContainer.getBoundingClientRect();

        sun.style.left = `${event.clientX - gameContainerRect.left - sun.offsetWidth / 2}px`;
        sun.style.top = `${event.clientY - gameContainerRect.top - sun.offsetHeight / 2}px`;

        gameContainer.appendChild(sun);
        sun.classList.add('visible');

        setTimeout(() => {
            sun.classList.remove('visible');
            setTimeout(() => sun.remove(), 300);
        }, 1000);
    }

    function increaseWaterLevel(amount) {
        waterLevel += amount;
        if (waterLevel > maxWaterLevelDisplay) {
            waterLevel = maxWaterLevelDisplay;
        }
        updateWaterLevelDisplay();
        checkGameOver();
    }

    function decreaseWaterLevel(amount) {
        waterLevel -= amount;
        if (waterLevel < 0) {
            waterLevel = 0;
        }
        updateWaterLevelDisplay();
    }

    function checkGameOver() {
        if (waterLevel >= maxWaterLevelDisplay) {
            endGame("Stodoła została zatopiona!");
        }
    }

    function endGame(message) {
        gameRunning = false;
        clearInterval(cloudIntervalId);
        document.querySelectorAll('.cloud').forEach(cloud => {
            stopCloudWaterCheck(cloud);
            cloud.remove();
        });
        gameOverMessage.textContent = message;
        gameOverScreen.classList.remove('hidden');
    }

    function startGame() {
        waterLevel = 0;
        updateWaterLevelDisplay();
        gameOverScreen.classList.add('hidden');
        cloudSpawnInterval = 1000;
        gameRunning = true;
        gameStartTime = Date.now();
        startCloudSpawning();
        startIntervalUpdate();
    }

    function startCloudSpawning() {
        clearInterval(cloudIntervalId);
        cloudIntervalId = setInterval(() => {
            spawnCloud();
        }, cloudSpawnInterval);
    }

    function startIntervalUpdate() {
        setInterval(() => {
            if (gameRunning) {
                const elapsedMinutes = Math.floor((Date.now() - gameStartTime) / 60000);
                if (elapsedMinutes > 0) {
                    cloudSpawnInterval = 1000 / Math.pow(2, elapsedMinutes);
                    if (cloudSpawnInterval < 100) cloudSpawnInterval = 100;
                    startCloudSpawning();
                }
            }
        }, 60000);
    }

    waterElement.addEventListener('click', () => {
        if (gameRunning) {
            decreaseWaterLevel(5);
        }
    });

    restartButton.addEventListener('click', startGame);

    // Initial start of the game
    startGame();
});