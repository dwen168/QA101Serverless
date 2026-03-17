const fs = require('fs');
const path = require('path');

function loadSkill(skillName) {
  const skillPath = path.join(__dirname, '..', '..', 'skills', skillName, 'SKILL.md');

  try {
    return fs.readFileSync(skillPath, 'utf-8');
  } catch {
    return `Skill: ${skillName}`;
  }
}

function loadSkills() {
  return {
    'market-intelligence': loadSkill('market-intelligence'),
    'eda-visual-analysis': loadSkill('eda-visual-analysis'),
    'trade-recommendation': loadSkill('trade-recommendation'),
  };
}

module.exports = {
  loadSkill,
  loadSkills,
};
