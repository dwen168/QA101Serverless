const fs = require('fs');
const path = require('path');

function readTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function loadSkill(skillName) {
  const promptPath = path.join(__dirname, '..', '..', 'skills', skillName, 'PROMPT.md');
  const skillPath = path.join(__dirname, '..', '..', 'skills', skillName, 'SKILL.md');

  return readTextFile(promptPath) || readTextFile(skillPath) || `Skill: ${skillName}`;
}

function loadSkills() {
  return {
    'market-intelligence': loadSkill('market-intelligence'),
    'eda-visual-analysis': loadSkill('eda-visual-analysis'),
    'trade-recommendation': loadSkill('trade-recommendation'),
    'portfolio-optimization': loadSkill('portfolio-optimization'),
    backtesting: loadSkill('backtesting'),
  };
}

module.exports = {
  loadSkill,
  loadSkills,
};
