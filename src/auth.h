#ifndef AUTH_H
#define AUTH_H

#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <cstdlib>
#include <ctime>
#include "healthscore.h"

using namespace std;

// =====================================================
// AUTH.H
// -----------------------------------------------------
// Real accounts for the web app: signup, login, session
// tokens, and a saved NutritionGoal per user. Kept in the
// same zero-external-library spirit as the rest of this
// project - no bcrypt, no database driver, just plain
// files (same pattern as products_clean.csv).
//
// Password hashing: a simple salted string hash, NOT a
// cryptographic algorithm like bcrypt/SHA-256. This is a
// documented simplification appropriate for a course
// project - good enough that passwords are not stored as
// plain text, but not meant for production use.
//
// Session tokens live in memory only - restarting the
// server logs everyone out (same simplification used in
// the project's earlier design discussions).
// =====================================================

struct User
{
    string username;
    string passwordHash;
};


// =====================================================
// SIMPLE SALTED HASH
// =====================================================

string hashPassword(string password)
{
    string salted =
        "nutritrack_salt_" + password;

    unsigned long hash = 5381;

    for (size_t i = 0; i < salted.length(); i++)
    {
        hash = ((hash << 5) + hash) + (unsigned char)salted[i];
    }

    stringstream ss;
    ss << hex << hash;
    return ss.str();
}


// =====================================================
// RANDOM TOKEN GENERATOR
// =====================================================

string generateToken()
{
    static bool seeded = false;

    if (!seeded)
    {
        srand((unsigned int)time(0));
        seeded = true;
    }

    string chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    string token = "";

    for (int i = 0; i < 24; i++)
    {
        token += chars[rand() % chars.length()];
    }

    return token;
}


// =====================================================
// CSV HELPERS (same dual-path trick as readFile in server.h)
// =====================================================

string resolveDataPath(string fileName)
{
    ifstream test1(("../data/" + fileName).c_str());
    if (test1.good())
    {
        test1.close();
        return "../data/" + fileName;
    }

    ifstream test2(("data/" + fileName).c_str());
    if (test2.good())
    {
        test2.close();
        return "data/" + fileName;
    }

    // Neither exists yet - default to ../data/ (matches
    // where products_clean.csv already lives) so a brand
    // new file gets created in the expected place.
    return "../data/" + fileName;
}


// =====================================================
// USER STORE
// =====================================================

class UserStore
{
private:
    vector<User> users;
    string usersPath;

    // userGoals is index-aligned with users (same pattern
    // the rest of this project uses for parallel vectors).
    vector<NutritionGoal> userGoals;
    string goalsPath;

    // token -> username, in-memory only.
    vector<pair<string, string> > sessions;

    int findUserIndex(string username)
    {
        for (size_t i = 0; i < users.size(); i++)
        {
            if (users[i].username == username)
            {
                return (int)i;
            }
        }
        return -1;
    }

public:

    UserStore()
    {
        usersPath = resolveDataPath("users.csv");
        goalsPath = resolveDataPath("goals.csv");
        loadUsers();
        loadGoals();
    }

    void loadUsers()
    {
        ifstream file(usersPath.c_str());
        if (!file.is_open()) return;

        string line;
        while (getline(file, line))
        {
            if (line.empty()) continue;
            size_t comma = line.find(',');
            if (comma == string::npos) continue;

            User u;
            u.username = line.substr(0, comma);
            u.passwordHash = line.substr(comma + 1);

            // strip possible trailing \r (CRLF files)
            if (!u.passwordHash.empty() &&
                u.passwordHash[u.passwordHash.size() - 1] == '\r')
            {
                u.passwordHash.erase(u.passwordHash.size() - 1);
            }

            users.push_back(u);
            userGoals.push_back(NutritionGoal());
        }
        file.close();
    }

    void loadGoals()
    {
        ifstream file(goalsPath.c_str());
        if (!file.is_open()) return;

        string line;
        while (getline(file, line))
        {
            if (line.empty()) continue;

            stringstream ss(line);
            string username, calStr, proStr, sugStr, sodStr;
            getline(ss, username, ',');
            getline(ss, calStr, ',');
            getline(ss, proStr, ',');
            getline(ss, sugStr, ',');
            getline(ss, sodStr, ',');

            int idx = findUserIndex(username);
            if (idx == -1) continue;

            if (!sodStr.empty() && sodStr[sodStr.size() - 1] == '\r')
            {
                sodStr.erase(sodStr.size() - 1);
            }

            NutritionGoal g;
            g.targetCalories = (float)atof(calStr.c_str());
            g.targetProtein = (float)atof(proStr.c_str());
            g.maxSugar = (float)atof(sugStr.c_str());
            g.maxSodium = (float)atof(sodStr.c_str());
            userGoals[idx] = g;
        }
        file.close();
    }

    void saveGoals()
    {
        ofstream file(goalsPath.c_str());
        for (size_t i = 0; i < users.size(); i++)
        {
            file << users[i].username << ","
                 << userGoals[i].targetCalories << ","
                 << userGoals[i].targetProtein << ","
                 << userGoals[i].maxSugar << ","
                 << userGoals[i].maxSodium << "\n";
        }
        file.close();
    }

    // Returns a token on success, "" if username is taken.
    string signup(string username, string password)
    {
        if (findUserIndex(username) != -1)
        {
            return "";
        }

        User u;
        u.username = username;
        u.passwordHash = hashPassword(password);
        users.push_back(u);
        userGoals.push_back(NutritionGoal());

        ofstream file(usersPath.c_str(), ios::app);
        file << u.username << "," << u.passwordHash << "\n";
        file.close();

        saveGoals(); // write a default row for the new user

        string token = generateToken();
        sessions.push_back(make_pair(token, username));
        return token;
    }

    // Returns a token on success, "" if username/password is wrong.
    string login(string username, string password)
    {
        int idx = findUserIndex(username);
        if (idx == -1) return "";

        if (users[idx].passwordHash != hashPassword(password))
        {
            return "";
        }

        string token = generateToken();
        sessions.push_back(make_pair(token, username));
        return token;
    }

    // Returns "" if the token isn't recognized.
    string usernameForToken(string token)
    {
        for (size_t i = 0; i < sessions.size(); i++)
        {
            if (sessions[i].first == token)
            {
                return sessions[i].second;
            }
        }
        return "";
    }

    NutritionGoal getGoal(string username)
    {
        int idx = findUserIndex(username);
        if (idx == -1) return NutritionGoal();
        return userGoals[idx];
    }

    void setGoal(string username, NutritionGoal goal)
    {
        int idx = findUserIndex(username);
        if (idx == -1) return;
        userGoals[idx] = goal;
        saveGoals();
    }
};

#endif
