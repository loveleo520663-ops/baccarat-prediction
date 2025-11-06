const express = require('express');
const db = require('../database');
const router = express.Router();
// 百家樂預測算法
class BaccaratPredictor {
  constructor() {
    this.patterns = {
      // 連續模式
      consecutive: {
        'BBB': { banker: 0.3, player: 0.65, tie: 0.05 },
        'PPP': { banker: 0.65, player: 0.3, tie: 0.05 },
        'BB': { banker: 0.4, player: 0.55, tie: 0.05 },
        'PP': { banker: 0.55, player: 0.4, tie: 0.05 }
      },
      // 交替模式
      alternating: {
        'BPBP': { banker: 0.45, player: 0.5, tie: 0.05 },
        'PBPB': { banker: 0.5, player: 0.45, tie: 0.05 },
        'BP': { banker: 0.48, player: 0.47, tie: 0.05 },
        'PB': { banker: 0.47, player: 0.48, tie: 0.05 }
      },
      // 隨機模式
      random: {
        default: { banker: 0.458, player: 0.446, tie: 0.096 }
      }
    };
  }

  // 分析歷史模式
  analyzePattern(history) {
    if (history.length < 2) {
      return this.patterns.random.default;
    }

    const recent = history.slice(-5).join('');
    
    // 檢查連續模式
    for (const [pattern, probabilities] of Object.entries(this.patterns.consecutive)) {
      if (recent.endsWith(pattern)) {
        return this.adjustProbabilities(probabilities, 'consecutive');
      }
    }

    // 檢查交替模式
    for (const [pattern, probabilities] of Object.entries(this.patterns.alternating)) {
      if (recent.includes(pattern)) {
        return this.adjustProbabilities(probabilities, 'alternating');
      }
    }

    // 計算趨勢
    const recentCount = Math.min(history.length, 10);
    const recentResults = history.slice(-recentCount);
    const bankerCount = recentResults.filter(r => r === 'B').length;
    const playerCount = recentResults.filter(r => r === 'P').length;
    
    let adjustment = 0;
    if (bankerCount > playerCount + 2) {
      adjustment = -0.1; // 莊家連勝，傾向於閒家
    } else if (playerCount > bankerCount + 2) {
      adjustment = 0.1; // 閒家連勝，傾向於莊家
    }

    return {
      banker: Math.max(0.1, Math.min(0.8, this.patterns.random.default.banker + adjustment)),
      player: Math.max(0.1, Math.min(0.8, this.patterns.random.default.player - adjustment)),
      tie: this.patterns.random.default.tie
    };
  }

  // 調整機率
  adjustProbabilities(baseProbabilities, patternType) {
    const factor = patternType === 'consecutive' ? 1.2 : 1.1;
    
    return {
      banker: Math.min(0.8, baseProbabilities.banker * factor),
      player: Math.min(0.8, baseProbabilities.player * factor),
      tie: baseProbabilities.tie
    };
  }

  // 生成預測
  predict(cardColors, gameHistory = []) {
    // 分析牌色模式
    const colorPattern = this.analyzeCardColors(cardColors);
    
    // 分析歷史模式
    const historyProbabilities = this.analyzePattern(gameHistory);
    
    // 結合分析結果
    const combinedProbabilities = this.combineProbabilities(
      colorPattern, 
      historyProbabilities
    );
    
    // 計算信心度
    const confidence = this.calculateConfidence(cardColors, gameHistory);
    
    // 決定最終預測
    const prediction = this.selectPrediction(combinedProbabilities);
    
    return {
      prediction,
      probabilities: combinedProbabilities,
      confidence,
      analysis: {
        cardColorPattern: colorPattern,
        historyTrend: historyProbabilities,
        factors: this.getAnalysisFactors(cardColors, gameHistory)
      }
    };
  }

  // 分析牌色模式
  analyzeCardColors(colors) {
    const redCount = colors.filter(c => c === 'red').length;
    const blackCount = colors.filter(c => c === 'black').length;
    
    let banker = 0.458;
    let player = 0.446;
    
    // 紅牌多傾向莊家，黑牌多傾向閒家
    if (redCount > blackCount) {
      banker += 0.05 * (redCount - blackCount);
      player -= 0.03 * (redCount - blackCount);
    } else if (blackCount > redCount) {
      player += 0.05 * (blackCount - redCount);
      banker -= 0.03 * (blackCount - redCount);
    }
    
    return {
      banker: Math.max(0.1, Math.min(0.8, banker)),
      player: Math.max(0.1, Math.min(0.8, player)),
      tie: 0.096
    };
  }

  // 結合機率
  combineProbabilities(colorProb, historyProb) {
    const weight1 = 0.6; // 牌色權重
    const weight2 = 0.4; // 歷史權重
    
    return {
      banker: colorProb.banker * weight1 + historyProb.banker * weight2,
      player: colorProb.player * weight1 + historyProb.player * weight2,
      tie: colorProb.tie * weight1 + historyProb.tie * weight2
    };
  }

  // 計算信心度
  calculateConfidence(cardColors, gameHistory) {
    let confidence = 0.5;
    
    // 根據資料完整性調整
    if (cardColors.length === 5) confidence += 0.2;
    if (gameHistory.length >= 10) confidence += 0.15;
    if (gameHistory.length >= 20) confidence += 0.1;
    
    // 根據模式明確度調整
    const pattern = gameHistory.slice(-5).join('');
    if (pattern.match(/B{3,}|P{3,}/)) confidence += 0.15; // 連續模式
    if (pattern.match(/(BP){2,}|(PB){2,}/)) confidence += 0.1; // 交替模式
    
    return Math.min(0.95, confidence);
  }

  // 選擇預測結果
  selectPrediction(probabilities) {
    const { banker, player, tie } = probabilities;
    
    if (banker > player && banker > tie) {
      return 'banker';
    } else if (player > banker && player > tie) {
      return 'player';
    } else {
      return 'tie';
    }
  }

  // 獲取分析因素
  getAnalysisFactors(cardColors, gameHistory) {
    const factors = [];
    
    const redCount = cardColors.filter(c => c === 'red').length;
    const blackCount = cardColors.filter(c => c === 'black').length;
    
    if (redCount > blackCount + 1) {
      factors.push('紅牌較多，傾向莊家');
    } else if (blackCount > redCount + 1) {
      factors.push('黑牌較多，傾向閒家');
    }
    
    if (gameHistory.length >= 3) {
      const recent = gameHistory.slice(-3).join('');
      if (recent === 'BBB') factors.push('莊家三連勝，可能轉向');
      if (recent === 'PPP') factors.push('閒家三連勝，可能轉向');
      if (recent.match(/(BP){2}|(PB){2}/)) factors.push('呈現交替模式');
    }
    
    return factors;
  }
}

const predictor = new BaccaratPredictor();

// 創建預測
router.post('/predict', (req, res) => {
  const { cardColors, gameHistory = [] } = req.body;
  const userId = req.user.id;

  // 驗證輸入
  if (!cardColors || !Array.isArray(cardColors) || cardColors.length !== 5) {
    return res.status(400).json({ error: '請選擇 5 張牌的顏色' });
  }

  const validColors = ['red', 'black'];
  if (!cardColors.every(color => validColors.includes(color))) {
    return res.status(400).json({ error: '牌色只能是紅色或黑色' });
  }

  try {
    // 生成預測
    const result = predictor.predict(cardColors, gameHistory);
    
    // 儲存預測記錄
    db.run(
      `INSERT INTO predictions (user_id, card_pattern, predicted_result, confidence_score) 
       VALUES (?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify(cardColors),
        result.prediction,
        result.confidence
      ],
      function(err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: '儲存預測失敗' });
        }

        res.json({
          success: true,
          predictionId: this.lastID,
          result: {
            prediction: result.prediction,
            confidence: Math.round(result.confidence * 100),
            probabilities: {
              banker: Math.round(result.probabilities.banker * 100),
              player: Math.round(result.probabilities.player * 100),
              tie: Math.round(result.probabilities.tie * 100)
            },
            analysis: result.analysis
          }
        });
      }
    );

    } catch (error) {
    console.error(error);
    res.status(500).json({ error: '預測生成失敗' });
  }
});

// 確認預測結果
router.put('/predict/:id/confirm', (req, res) => {
  const predictionId = req.params.id;
  const { actualResult } = req.body;
  const userId = req.user.id;

  if (!['banker', 'player', 'tie'].includes(actualResult)) {
    return res.status(400).json({ error: '無效的結果' });
  }

  // 檢查預測是否存在且屬於當前用戶
  db.get(
    'SELECT predicted_result FROM predictions WHERE id = ? AND user_id = ?',
    [predictionId, userId],
    (err, prediction) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: '資料庫錯誤' });
      }

      if (!prediction) {
        return res.status(404).json({ error: '預測記錄不存在' });
      }

      const isCorrect = prediction.predicted_result === actualResult;

      // 更新預測結果
      db.run(
        'UPDATE predictions SET actual_result = ?, is_correct = ? WHERE id = ?',
        [actualResult, isCorrect ? 1 : 0, predictionId],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: '更新預測結果失敗' });
          }

          res.json({
            success: true,
            isCorrect,
            message: isCorrect ? '預測正確！' : '預測錯誤'
          });
        }
      );
    }
  );

  });

// 獲取用戶預測歷史
router.get('/history', (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  // 獲取總數
  db.get('SELECT COUNT(*) as total FROM predictions WHERE user_id = ?', [userId], (err, countResult) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }

    // 獲取預測歷史
    db.all(`
      SELECT id, card_pattern, predicted_result, actual_result, 
             is_correct, confidence_score, created_at
      FROM predictions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [userId, limit, offset], (err, predictions) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: '資料庫錯誤' });
      }

      // 解析 JSON 字段
      const formattedPredictions = predictions.map(p => ({
        ...p,
        card_pattern: JSON.parse(p.card_pattern)
      }));

      res.json({
        success: true,
        predictions: formattedPredictions,
        total: countResult.total,
        page: parseInt(page),
        totalPages: Math.ceil(countResult.total / limit)
      });
    });
  });

  });

// 獲取用戶統計
router.get('/stats', (req, res) => {
  const userId = req.user.id;

  const stats = {};

  db.serialize(() => {
    // 總預測數
    db.get('SELECT COUNT(*) as total FROM predictions WHERE user_id = ?', [userId], (err, total) => {
      if (err) console.error(err);
      stats.totalPredictions = total ? total.total : 0;
    });

    // 正確預測數
    db.get('SELECT COUNT(*) as correct FROM predictions WHERE user_id = ? AND is_correct = 1', [userId], (err, correct) => {
      if (err) console.error(err);
      stats.correctPredictions = correct ? correct.correct : 0;
    });

    // 各結果統計
    db.all(`
      SELECT predicted_result, COUNT(*) as count 
      FROM predictions 
      WHERE user_id = ? 
      GROUP BY predicted_result
    `, [userId], (err, resultStats) => {
      if (err) console.error(err);
      stats.predictionBreakdown = resultStats || [];
    });

    // 最近準確率
    db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
      FROM predictions 
      WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
    `, [userId], (err, recentStats) => {
      if (err) console.error(err);
      
      if (recentStats && recentStats.total > 0) {
        stats.recentAccuracy = Math.round((recentStats.correct / recentStats.total) * 100);
      } else {
        stats.recentAccuracy = 0;
      }

      // 計算總體準確率
      if (stats.totalPredictions > 0) {
        stats.overallAccuracy = Math.round((stats.correctPredictions / stats.totalPredictions) * 100);
      } else {
        stats.overallAccuracy = 0;
      }

      res.json({ success: true, stats });
    });
  });

  });

module.exports = router;