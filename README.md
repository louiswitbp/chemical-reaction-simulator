<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>화학 반응속도 시뮬레이터</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="shell">
    <section class="panel panel-story">
      <div class="eyebrow">Chemical Kinetics Lab</div>
      <h1>화학 반응속도 시뮬레이션</h1>
      <p class="intro">
        반응물 A와 B가 충돌해 생성물 P를 만드는 가상의 실험
        온도, 농도, 촉매 조건을 조절하면 충돌 빈도와 유효 충돌 비율이 함께 변하며
        그래프와 입자 움직임에 즉시 반영
      </p>

      <div class="experiment-card">
        <h2>실험 설명</h2>
        <p>
          반응식: <strong>A + B → P</strong><br>
          가정: 반응속도는 충돌 이론과 단순화된 Arrhenius 경향을 따릅니다.
        </p>
        <ul class="notes">
          <li>농도가 높을수록 단위 시간당 충돌 수가 증가합니다.</li>
          <li>온도가 높을수록 입자 속도와 활성화 에너지 극복 확률이 증가합니다.</li>
          <li>촉매는 활성화 에너지를 낮춰 유효 충돌 비율을 높입니다.</li>
        </ul>
      </div>

      <div class="controls">
        <label>
          <span>반응물 농도</span>
          <input id="concentration" type="range" min="0.5" max="2.0" step="0.1" value="1.0">
          <strong id="concentrationValue">1.0 mol/L</strong>
        </label>
        <label>
          <span>온도</span>
          <input id="temperature" type="range" min="250" max="650" step="10" value="350">
          <strong id="temperatureValue">350 K</strong>
        </label>
        <label>
          <span>촉매 효율</span>
          <input id="catalyst" type="range" min="0" max="100" step="5" value="25">
          <strong id="catalystValue">25%</strong>
        </label>
      </div>

      <div class="stats">
        <article>
          <span>예상 반응속도</span>
          <strong id="rateValue">0.00</strong>
          <small>mol/L·s</small>
        </article>
        <article>
          <span>유효 충돌 비율</span>
          <strong id="collisionValue">0%</strong>
          <small>effective collisions</small>
        </article>
        <article>
          <span>생성물 진행도</span>
          <strong id="progressValue">0%</strong>
          <small>reaction progress</small>
        </article>
      </div>
    </section>

    <section class="panel panel-visual">
      <div class="visual-header">
        <div>
          <div class="eyebrow">Realtime Output</div>
          <h2>입자 및 반응속도 데이터</h2>
        </div>
        <button id="resetButton" type="button">실험 초기화</button>
      </div>

      <div class="viz-grid">
        <section class="viz-card">
          <div class="card-title">입자 시각화</div>
          <canvas id="particleCanvas" width="640" height="360" aria-label="입자 시각화"></canvas>
          <p class="caption">파란색은 A, 주황색은 B, 밝은 노란색 점멸은 반응이 일어난 충돌입니다.</p>
        </section>

        <section class="viz-card">
          <div class="card-title">반응속도 그래프</div>
          <canvas id="chartCanvas" width="640" height="360" aria-label="반응속도 그래프"></canvas>
          <p class="caption">시간에 따른 반응속도 변화를 추적하며 조건 변화가 곡선에 누적됩니다.</p>
        </section>
      </div>
    </section>
  </main>

  <script src="script.js"></script>
</body>
</html>
