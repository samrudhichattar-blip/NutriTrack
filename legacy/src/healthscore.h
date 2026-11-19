#ifndef HEALTHSCORE_H
#define HEALTHSCORE_H

#include <iostream>
#include <algorithm>
#include <cmath>
#include <string>
#include "nutrition.h"

using namespace std;

// =====================================================
// NUTRITION GOAL
// =====================================================
// Holds the user's personal targets. No login system exists yet in
// NutriTrack, so this is a single in-memory goal for the current run,
// editable from the menu (see setNutritionGoal() in main.cpp).

struct NutritionGoal
{
    float targetCalories;
    float targetProtein;
    float maxSugar;
    float maxSodium;

    NutritionGoal()
    {
        targetCalories = 2000;
        targetProtein = 60;
        maxSugar = 50;
        maxSodium = 2300;
    }
};


// =====================================================
// HEALTH SCORE BREAKDOWN
// =====================================================

struct HealthScoreBreakdown
{
    float calorieScore;
    float proteinScore;
    float sugarScore;
    float sodiumScore;
    float overall;
    string weakestArea;
};


// =====================================================
// CLAMP HELPER
// =====================================================

float clampScore(float value)
{
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
}


// =====================================================
// COMPUTE HEALTH SCORE
// =====================================================
// A documented weighted formula (NOT machine learning), so every point of
// the score can be explained: 25% calorie balance, 25% protein progress,
// 25% sugar headroom, 25% sodium headroom, each relative to the goal.

HealthScoreBreakdown computeHealthScore(
    NutritionTotal total,
    NutritionGoal goal)
{
    HealthScoreBreakdown score;

    float calorieDeviation =
        fabs(total.calories - goal.targetCalories) / goal.targetCalories;

    score.calorieScore =
        clampScore(100.0f - calorieDeviation * 100.0f);

    score.proteinScore =
        clampScore((total.protein / goal.targetProtein) * 100.0f);

    score.sugarScore =
        clampScore(100.0f - (total.sugar / goal.maxSugar) * 100.0f);

    score.sodiumScore =
        clampScore(100.0f - (total.sodium / goal.maxSodium) * 100.0f);

    score.overall =
        (score.calorieScore +
         score.proteinScore +
         score.sugarScore +
         score.sodiumScore) / 4.0f;

    float weakest = score.calorieScore;
    score.weakestArea = "Calories";

    if (score.proteinScore < weakest)
    {
        weakest = score.proteinScore;
        score.weakestArea = "Protein";
    }

    if (score.sugarScore < weakest)
    {
        weakest = score.sugarScore;
        score.weakestArea = "Sugar";
    }

    if (score.sodiumScore < weakest)
    {
        weakest = score.sodiumScore;
        score.weakestArea = "Sodium";
    }

    return score;
}


// =====================================================
// SIMPLE TEXT BAR (for console display)
// =====================================================

string makeBar(float value)
{
    int filled = (int)(value / 5.0f); // 20 chars max, each = 5 points
    string bar = "";

    for (int i = 0; i < 20; i++)
    {
        if (i < filled)
            bar += "#";
        else
            bar += "-";
    }

    return bar;
}


// =====================================================
// DISPLAY HEALTH SCORE
// =====================================================

void displayHealthScore(HealthScoreBreakdown score)
{
    cout << "\n========== BASKET HEALTH SCORE ==========\n";

    cout << "\nOverall Score: "
         << score.overall
         << " / 100\n";

    cout << "\nCalories  ["
         << makeBar(score.calorieScore)
         << "] "
         << score.calorieScore;

    cout << "\nProtein   ["
         << makeBar(score.proteinScore)
         << "] "
         << score.proteinScore;

    cout << "\nSugar     ["
         << makeBar(score.sugarScore)
         << "] "
         << score.sugarScore;

    cout << "\nSodium    ["
         << makeBar(score.sodiumScore)
         << "] "
         << score.sodiumScore;

    cout << "\n\nWeakest area: "
         << score.weakestArea;

    cout << "\n==========================================\n";
}


// =====================================================
// WHAT-IF COMPARISON (before / after a basket change)
// =====================================================
// Reuses the exact same computeHealthScore() formula on two different
// NutritionTotal snapshots, so "What-If" costs nothing extra to maintain -
// it is the same score, computed twice.

void displayWhatIfComparison(
    NutritionTotal before,
    NutritionTotal after,
    NutritionGoal goal)
{
    HealthScoreBreakdown scoreBefore =
        computeHealthScore(before, goal);

    HealthScoreBreakdown scoreAfter =
        computeHealthScore(after, goal);

    cout << "\n========== WHAT-IF: BEFORE vs AFTER ==========\n";

    cout << "\nBEFORE:";
    cout << "\n  Calories: " << before.calories << " kcal";
    cout << "\n  Protein:  " << before.protein << " g";
    cout << "\n  Sugar:    " << before.sugar << " g";
    cout << "\n  Sodium:   " << before.sodium << " mg";
    cout << "\n  Health Score: " << scoreBefore.overall << " / 100";

    cout << "\n\nAFTER:";
    cout << "\n  Calories: " << after.calories << " kcal";
    cout << "\n  Protein:  " << after.protein << " g";
    cout << "\n  Sugar:    " << after.sugar << " g";
    cout << "\n  Sodium:   " << after.sodium << " mg";
    cout << "\n  Health Score: " << scoreAfter.overall << " / 100";

    float change = scoreAfter.overall - scoreBefore.overall;

    cout << "\n\nChange: "
         << (change >= 0 ? "+" : "")
         << change
         << " points";

    cout << "\n================================================\n";
}

#endif
