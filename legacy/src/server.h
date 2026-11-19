#ifndef SERVER_H
#define SERVER_H

#include <iostream>
#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <winsock2.h>

#include "product.h"
#include "hashtable.h"
#include "basket.h"
#include "stack.h"
#include "nutrition.h"
#include "heap.h"
#include "healthscore.h"
#include "auth.h"

using namespace std;


// =====================================================
// RECOMMENDATION HEAP
// =====================================================

class RecommendationHeap
{
private:

    vector<Product> data;
    int preference;


    bool better(Product a, Product b)
    {
        if (preference == 1)
        {
            // Low Calories
            return a.calories < b.calories;
        }

        if (preference == 2)
        {
            // High Protein
            return a.protein > b.protein;
        }

        if (preference == 3)
        {
            // Low Sugar
            return a.sugar < b.sugar;
        }

        if (preference == 4)
        {
            // High Fiber
            return a.fiber > b.fiber;
        }

        // Low Sodium
        return a.sodium < b.sodium;
    }


    void heapifyUp(int index)
    {
        while (index > 0)
        {
            int parent =
                (index - 1) / 2;

            if (
                better(
                    data[index],
                    data[parent]
                )
            )
            {
                Product temp =
                    data[index];

                data[index] =
                    data[parent];

                data[parent] =
                    temp;

                index = parent;
            }
            else
            {
                break;
            }
        }
    }


    void heapifyDown(int index)
    {
        int size =
            data.size();

        while (true)
        {
            int left =
                2 * index + 1;

            int right =
                2 * index + 2;

            int best =
                index;


            if (
                left < size &&
                better(
                    data[left],
                    data[best]
                )
            )
            {
                best = left;
            }


            if (
                right < size &&
                better(
                    data[right],
                    data[best]
                )
            )
            {
                best = right;
            }


            if (best != index)
            {
                Product temp =
                    data[index];

                data[index] =
                    data[best];

                data[best] =
                    temp;

                index = best;
            }
            else
            {
                break;
            }
        }
    }


public:

    RecommendationHeap(
        vector<Product> products,
        int pref
    )
    {
        data =
            products;

        preference =
            pref;


        for (
            int i = 1;
            i < data.size();
            i++
        )
        {
            heapifyUp(i);
        }
    }


    bool isEmpty()
    {
        return data.empty();
    }


    Product removeTop()
    {
        Product top =
            data[0];


        data[0] =
            data[data.size() - 1];


        data.pop_back();


        if (!data.empty())
        {
            heapifyDown(0);
        }


        return top;
    }
};


// =====================================================
// WEB SERVER
// =====================================================

class WebServer
{
private:

    vector<Product>* products;

    HashTable* productTable;

    GroceryBasket* basket;

    OperationStack* operationStack;

    void (*undoFunction)();

    SOCKET serverSocket;

    UserStore userStore;


    // =================================================
    // READ FILE
    // =================================================

    string readFile(
        string fileName
    )
    {
        ifstream file(
    fileName.c_str(),
    ios::in | ios::binary
);


        if (!file.is_open())
        {
            return "";
        }


        stringstream buffer;

        buffer <<
            file.rdbuf();


        file.close();


        return buffer.str();
    }


    // =================================================
    // SEND RESPONSE
    // =================================================

    void sendResponse(
        SOCKET client,
        string content,
        string contentType =
            "application/json"
    )
    {
        string response =
            "HTTP/1.1 200 OK\r\n"
            "Content-Type: " +
            contentType +
            "\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
            "Access-Control-Allow-Headers: Content-Type\r\n"
            "Content-Length: " +
            to_string(
                content.length()
            ) +
            "\r\n"
            "Connection: close\r\n"
            "\r\n" +
            content;


        send(
            client,
            response.c_str(),
            response.length(),
            0
        );
    }


    // =================================================
    // 404 RESPONSE
    // =================================================

    void send404(
        SOCKET client
    )
    {
        string content =
            "Not Found";


        string response =
            "HTTP/1.1 404 Not Found\r\n"
            "Content-Type: text/plain\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "Content-Length: " +
            to_string(
                content.length()
            ) +
            "\r\n"
            "Connection: close\r\n"
            "\r\n" +
            content;


        send(
            client,
            response.c_str(),
            response.length(),
            0
        );
    }


    // =================================================
    // PRODUCT TO JSON
    // =================================================

    string productToJSON(
        Product p
    )
    {
        string json = "{";


        json +=
            "\"id\":\"" +
            p.product_id +
            "\",";


        json +=
            "\"name\":\"" +
            p.product_name +
            "\",";


        json +=
            "\"generic_name\":\"" +
            p.generic_name +
            "\",";


        json +=
            "\"brand\":\"" +
            p.brand +
            "\",";


        json +=
            "\"category\":\"" +
            p.category +
            "\",";


        json +=
            "\"calories\":" +
            to_string(
                p.calories
            ) +
            ",";


        json +=
            "\"protein\":" +
            to_string(
                p.protein
            ) +
            ",";


        json +=
            "\"carbohydrates\":" +
            to_string(
                p.carbohydrates
            ) +
            ",";


        json +=
            "\"sugar\":" +
            to_string(
                p.sugar
            ) +
            ",";


        json +=
            "\"fat\":" +
            to_string(
                p.fat
            ) +
            ",";


        json +=
            "\"saturated_fat\":" +
            to_string(
                p.saturated_fat
            ) +
            ",";


        json +=
            "\"fiber\":" +
            to_string(
                p.fiber
            ) +
            ",";


        json +=
            "\"sodium\":" +
            to_string(
                p.sodium
            );


        json += "}";


        return json;
    }


    // =================================================
    // ALL PRODUCTS
    // =================================================

    string productsToJSON()
    {
        string json = "[";


        for (
            int i = 0;
            i < products->size();
            i++
        )
        {
            if (i > 0)
            {
                json += ",";
            }


            json +=
                productToJSON(
                    (*products)[i]
                );
        }


        json += "]";


        return json;
    }


    // =================================================
    // HASH TABLE SEARCH
    // =================================================

    string searchProductJSON(
        string productID
    )
    {
        int index =
            productTable->search(
                productID
            );


        if (index == -1)
        {
            return
                "{\"found\":false}";
        }


        string json = "{";


        json +=
            "\"found\":true,";


        json +=
            "\"product\":";


        json +=
            productToJSON(
                (*products)[index]
            );


        json += "}";


        return json;
    }


    // =================================================
    // BASKET JSON
    // =================================================

    string basketToJSON()
    {
        string json = "[";


        BasketNode* current =
            basket->getHead();


        bool first = true;


        while (
            current != NULL
        )
        {
            int index =
                current->productIndex;


            if (
                index >= 0 &&
                index < products->size()
            )
            {
                if (!first)
                {
                    json += ",";
                }


                json += "{";


                json +=
                    "\"id\":\"" +
                    (*products)[index]
                        .product_id +
                    "\",";


                json +=
                    "\"name\":\"" +
                    (*products)[index]
                        .product_name +
                    "\",";


                json +=
                    "\"category\":\"" +
                    (*products)[index]
                        .category +
                    "\",";


                json +=
                    "\"quantity\":" +
                    to_string(
                        current->quantity
                    );


                json += "}";


                first = false;
            }


            current =
                current->next;
        }


        json += "]";


        return json;
    }


    // =================================================
    // NUTRITION JSON
    // =================================================

    string nutritionToJSON()
    {
        NutritionTotal total =
            calculateBasketNutrition(
                basket->getHead(),
                *products
            );


        string json = "{";


        json +=
            "\"calories\":" +
            to_string(
                total.calories
            ) +
            ",";


        json +=
            "\"protein\":" +
            to_string(
                total.protein
            ) +
            ",";


        json +=
            "\"carbohydrates\":" +
            to_string(
                total.carbohydrates
            ) +
            ",";


        json +=
            "\"sugar\":" +
            to_string(
                total.sugar
            ) +
            ",";


        json +=
            "\"fat\":" +
            to_string(
                total.fat
            ) +
            ",";


        json +=
            "\"fiber\":" +
            to_string(
                total.fiber
            ) +
            ",";


        json +=
            "\"sodium\":" +
            to_string(
                total.sodium
            );


        json += "}";


        return json;
    }


    // =================================================
    // GOAL JSON
    // =================================================

    string goalToJSON(
        NutritionGoal goal
    )
    {
        string json = "{";

        json +=
            "\"targetCalories\":" +
            to_string(goal.targetCalories) +
            ",";

        json +=
            "\"targetProtein\":" +
            to_string(goal.targetProtein) +
            ",";

        json +=
            "\"maxSugar\":" +
            to_string(goal.maxSugar) +
            ",";

        json +=
            "\"maxSodium\":" +
            to_string(goal.maxSodium);

        json += "}";

        return json;
    }


    // =================================================
    // HEALTH SCORE JSON
    // =================================================

    string healthScoreToJSON(
        string username
    )
    {
        NutritionTotal total =
            calculateBasketNutrition(
                basket->getHead(),
                *products
            );

        NutritionGoal goal =
            userStore.getGoal(username);

        HealthScoreBreakdown score =
            computeHealthScore(total, goal);

        string json = "{";

        json +=
            "\"overall\":" +
            to_string(score.overall) +
            ",";

        json +=
            "\"calorieScore\":" +
            to_string(score.calorieScore) +
            ",";

        json +=
            "\"proteinScore\":" +
            to_string(score.proteinScore) +
            ",";

        json +=
            "\"sugarScore\":" +
            to_string(score.sugarScore) +
            ",";

        json +=
            "\"sodiumScore\":" +
            to_string(score.sodiumScore) +
            ",";

        json +=
            "\"weakestArea\":\"" +
            score.weakestArea +
            "\"";

        json += "}";

        return json;
    }


    // =================================================
    // NUTRITION TOTAL TO JSON (used by What-If)
    // =================================================

    string totalToJSON(
        NutritionTotal total
    )
    {
        string json = "{";

        json += "\"calories\":" + to_string(total.calories) + ",";
        json += "\"protein\":" + to_string(total.protein) + ",";
        json += "\"sugar\":" + to_string(total.sugar) + ",";
        json += "\"sodium\":" + to_string(total.sodium);

        json += "}";

        return json;
    }


    // =================================================
    // HEAP RECOMMENDATIONS
    // =================================================

    string recommendationsToJSON(
        string productID,
        int preference
    )
    {
        int selectedIndex =
            productTable->search(
                productID
            );


        if (selectedIndex == -1)
        {
            return "[]";
        }


        string category =
            (*products)[selectedIndex]
                .category;


        vector<Product>
            categoryProducts;


        for (
            int i = 0;
            i < products->size();
            i++
        )
        {
            if (
                (*products)[i].category
                    == category
                &&
                i != selectedIndex
            )
            {
                categoryProducts.push_back(
                    (*products)[i]
                );
            }
        }


        if (
            categoryProducts.empty()
        )
        {
            return "[]";
        }


        RecommendationHeap heap(
            categoryProducts,
            preference
        );


        string json = "[";


        int count = 0;


        while (
            !heap.isEmpty() &&
            count < 5
        )
        {
            Product p =
                heap.removeTop();


            if (count > 0)
            {
                json += ",";
            }


            json +=
                productToJSON(p);


            count++;
        }


        json += "]";


        return json;
    }


    // =================================================
    // GET URL PARAMETER
    // =================================================

    string getParameter(
        string request,
        string parameter
    )
    {
        string search =
            parameter + "=";


        size_t position =
            request.find(
                search
            );


        if (
            position ==
            string::npos
        )
        {
            return "";
        }


        position +=
            search.length();


        size_t end =
            request.find(
                "&",
                position
            );


        if (
            end ==
            string::npos
        )
        {
            end =
                request.find(
                    " ",
                    position
                );
        }


        return request.substr(
            position,
            end - position
        );
    }


    // =================================================
    // HANDLE CLIENT
    // =================================================

    void handleClient(
        SOCKET client
    )
    {
        char buffer[8192];


        int bytesReceived =
            recv(
                client,
                buffer,
                sizeof(buffer) - 1,
                0
            );


        if (
            bytesReceived <= 0
        )
        {
            closesocket(client);

            return;
        }


        buffer[
            bytesReceived
        ] = '\0';


        string request(
            buffer
        );


        cout
            << "\nRequest: "
            << request.substr(
                0,
                request.find(
                    "\r\n"
                )
            )
            << endl;


        // =================================================
        // OPTIONS
        // =================================================

        if (
            request.find(
                "OPTIONS"
            ) == 0
        )
        {
            string response =
                "HTTP/1.1 200 OK\r\n"
                "Access-Control-Allow-Origin: *\r\n"
                "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
                "Access-Control-Allow-Headers: Content-Type\r\n"
                "Content-Length: 0\r\n"
                "\r\n";


            send(
                client,
                response.c_str(),
                response.length(),
                0
            );


            closesocket(client);

            return;
        }


        // =================================================
        // GET PRODUCTS
        // =================================================

        if (
            request.find(
                "GET /api/products"
            ) == 0
        )
        {
            sendResponse(
                client,
                productsToJSON()
            );
        }


        // =================================================
        // SEARCH
        // =================================================

        else if (
            request.find(
                "GET /api/search"
            ) == 0
        )
        {
            string id =
                getParameter(
                    request,
                    "id"
                );


            sendResponse(
                client,
                searchProductJSON(id)
            );
        }


        // =================================================
        // GET BASKET
        // =================================================

        else if (
            request.find(
                "GET /api/basket"
            ) == 0
        )
        {
            sendResponse(
                client,
                basketToJSON()
            );
        }


        // =================================================
        // GET NUTRITION
        // =================================================

        else if (
            request.find(
                "GET /api/nutrition"
            ) == 0
        )
        {
            sendResponse(
                client,
                nutritionToJSON()
            );
        }


        // =================================================
        // GET RECOMMENDATIONS
        // =================================================

        else if (
            request.find(
                "GET /api/recommendations"
            ) == 0
        )
        {
            string id =
                getParameter(
                    request,
                    "id"
                );


            string preferenceText =
                getParameter(
                    request,
                    "preference"
                );


            int preference = 1;


            if (
                preferenceText != ""
            )
            {
                preference =
                    stoi(
                        preferenceText
                    );
            }


            if (
                preference < 1 ||
                preference > 5
            )
            {
                preference = 1;
            }


            sendResponse(
                client,
                recommendationsToJSON(
                    id,
                    preference
                )
            );
        }


        // =================================================
        // ADD TO BASKET
        // =================================================

        else if (
            request.find(
                "POST /api/basket/add"
            ) == 0
        )
        {
            string id =
                getParameter(
                    request,
                    "id"
                );


            int index =
                productTable->search(
                    id
                );


            if (index == -1)
            {
                sendResponse(
                    client,
                    "{\"success\":false}"
                );
            }
            else
            {
                basket->addProduct(
                    index,
                    100
                );


                operationStack->push(
                    index,
                    100,
                    'A'
                );


                sendResponse(
                    client,
                    "{\"success\":true}"
                );
            }
        }


        // =================================================
        // REMOVE FROM BASKET
        // =================================================

        else if (
            request.find(
                "POST /api/basket/remove"
            ) == 0
        )
        {
            string id =
                getParameter(
                    request,
                    "id"
                );


            int index =
                productTable->search(
                    id
                );


            if (index == -1)
            {
                sendResponse(
                    client,
                    "{\"success\":false}"
                );
            }
            else
            {
                // removeProduct() is VOID
                basket->removeProduct(
                    index
                );


                operationStack->push(
                    index,
                    0,
                    'R'
                );


                sendResponse(
                    client,
                    "{\"success\":true}"
                );
            }
        }


        // =================================================
        // INCREASE QUANTITY
        // =================================================

        else if (
            request.find(
                "POST /api/basket/increase"
            ) == 0
        )
        {
            string id =
                getParameter(
                    request,
                    "id"
                );


            int index =
                productTable->search(
                    id
                );


            if (index == -1)
            {
                sendResponse(
                    client,
                    "{\"success\":false}"
                );
            }
            else
            {
                basket->changeQuantity(
                    index,
                    100
                );


                operationStack->push(
                    index,
                    100,
                    'I'
                );


                sendResponse(
                    client,
                    "{\"success\":true}"
                );
            }
        }


        // =================================================
        // DECREASE QUANTITY
        // =================================================

        else if (
            request.find(
                "POST /api/basket/decrease"
            ) == 0
        )
        {
            string id =
                getParameter(
                    request,
                    "id"
                );


            int index =
                productTable->search(
                    id
                );


            if (index == -1)
            {
                sendResponse(
                    client,
                    "{\"success\":false}"
                );
            }
            else
            {
                float quantity =
                    basket->getQuantity(
                        index
                    );


                if (
                    quantity > 100
                )
                {
                    basket->changeQuantity(
                        index,
                        -100
                    );


                    operationStack->push(
                        index,
                        100,
                        'D'
                    );
                }


                sendResponse(
                    client,
                    "{\"success\":true}"
                );
            }
        }


        // =================================================
        // UNDO
        // =================================================

        else if (
            request.find(
                "POST /api/undo"
            ) == 0
        )
        {
            if (
                operationStack->isEmpty()
            )
            {
                sendResponse(
                    client,
                    "{\"success\":false,\"message\":\"Nothing to undo\"}"
                );
            }
            else
            {
                if (
                    undoFunction != NULL
                )
                {
                    undoFunction();
                }


                sendResponse(
                    client,
                    "{\"success\":true}"
                );
            }
        }


        // =================================================
        // SIGNUP
        // =================================================

        else if (
            request.find(
                "POST /api/signup"
            ) == 0
        )
        {
            string username =
                getParameter(request, "username");

            string password =
                getParameter(request, "password");

            if (username == "" || password == "")
            {
                sendResponse(
                    client,
                    "{\"success\":false,\"message\":\"username and password required\"}"
                );
            }
            else
            {
                string token =
                    userStore.signup(username, password);

                if (token == "")
                {
                    sendResponse(
                        client,
                        "{\"success\":false,\"message\":\"username already taken\"}"
                    );
                }
                else
                {
                    sendResponse(
                        client,
                        "{\"success\":true,\"token\":\"" + token +
                        "\",\"username\":\"" + username + "\"}"
                    );
                }
            }
        }


        // =================================================
        // LOGIN
        // =================================================

        else if (
            request.find(
                "POST /api/login"
            ) == 0
        )
        {
            string username =
                getParameter(request, "username");

            string password =
                getParameter(request, "password");

            string token =
                userStore.login(username, password);

            if (token == "")
            {
                sendResponse(
                    client,
                    "{\"success\":false,\"message\":\"invalid username or password\"}"
                );
            }
            else
            {
                sendResponse(
                    client,
                    "{\"success\":true,\"token\":\"" + token +
                    "\",\"username\":\"" + username + "\"}"
                );
            }
        }


        // =================================================
        // GET GOAL
        // =================================================

        else if (
            request.find(
                "GET /api/goal"
            ) == 0
        )
        {
            string token =
                getParameter(request, "token");

            string username =
                userStore.usernameForToken(token);

            if (username == "")
            {
                sendResponse(
                    client,
                    "{\"success\":false,\"message\":\"not authenticated\"}"
                );
            }
            else
            {
                sendResponse(
                    client,
                    goalToJSON(userStore.getGoal(username))
                );
            }
        }


        // =================================================
        // SET GOAL
        // =================================================

        else if (
            request.find(
                "POST /api/goal"
            ) == 0
        )
        {
            string token =
                getParameter(request, "token");

            string username =
                userStore.usernameForToken(token);

            if (username == "")
            {
                sendResponse(
                    client,
                    "{\"success\":false,\"message\":\"not authenticated\"}"
                );
            }
            else
            {
                NutritionGoal goal;

                goal.targetCalories =
                    (float)atof(getParameter(request, "targetCalories").c_str());

                goal.targetProtein =
                    (float)atof(getParameter(request, "targetProtein").c_str());

                goal.maxSugar =
                    (float)atof(getParameter(request, "maxSugar").c_str());

                goal.maxSodium =
                    (float)atof(getParameter(request, "maxSodium").c_str());

                userStore.setGoal(username, goal);

                sendResponse(
                    client,
                    "{\"success\":true}"
                );
            }
        }


        // =================================================
        // HEALTH SCORE
        // =================================================

        else if (
            request.find(
                "GET /api/healthscore"
            ) == 0
        )
        {
            string token =
                getParameter(request, "token");

            string username =
                userStore.usernameForToken(token);

            if (username == "")
            {
                sendResponse(
                    client,
                    "{\"success\":false,\"message\":\"not authenticated\"}"
                );
            }
            else
            {
                sendResponse(
                    client,
                    healthScoreToJSON(username)
                );
            }
        }


        // =================================================
        // WHAT-IF: REPLACE BASKET PRODUCT
        // =================================================

        else if (
            request.find(
                "POST /api/basket/replace"
            ) == 0
        )
        {
            string oldId =
                getParameter(request, "oldId");

            string newId =
                getParameter(request, "newId");

            int oldIndex =
                productTable->search(oldId);

            int newIndex =
                productTable->search(newId);

            if (oldIndex == -1 || newIndex == -1 ||
                !basket->containsProduct(oldIndex))
            {
                sendResponse(
                    client,
                    "{\"success\":false}"
                );
            }
            else
            {
                float quantity =
                    basket->getQuantity(oldIndex);

                NutritionTotal before =
                    calculateBasketNutrition(
                        basket->getHead(), *products);

                bool replaced =
                    basket->replaceProduct(oldIndex, newIndex);

                if (replaced)
                {
                    operationStack->pushReplacement(
                        oldIndex, newIndex, quantity);
                }

                NutritionTotal after =
                    calculateBasketNutrition(
                        basket->getHead(), *products);

                string token =
                    getParameter(request, "token");

                string username =
                    userStore.usernameForToken(token);

                NutritionGoal goal =
                    (username != "")
                        ? userStore.getGoal(username)
                        : NutritionGoal();

                HealthScoreBreakdown scoreBefore =
                    computeHealthScore(before, goal);

                HealthScoreBreakdown scoreAfter =
                    computeHealthScore(after, goal);

                string json = "{";
                json += "\"success\":true,";
                json += "\"before\":" + totalToJSON(before) + ",";
                json += "\"after\":" + totalToJSON(after) + ",";
                json += "\"scoreBefore\":" + to_string(scoreBefore.overall) + ",";
                json += "\"scoreAfter\":" + to_string(scoreAfter.overall);
                json += "}";

                sendResponse(client, json);
            }
        }


        // =================================================
        // HOME PAGE (redirects to login or dashboard)
        // =================================================

        else if (
            request.find(
                "GET / "
            ) == 0
        )
        {
            string html =
                readFile(
                    "../web/index.html"
                );


            if (html == "")
            {
                html =
                    readFile(
                        "web/index.html"
                    );
            }


            if (html == "")
            {
                send404(client);
            }
            else
            {
                sendResponse(
                    client,
                    html,
                    "text/html"
                );
            }
        }


        // =================================================
        // LOGIN PAGE
        // =================================================

        else if (
            request.find(
                "GET /login.html"
            ) == 0
        )
        {
            string html = readFile("../web/login.html");
            if (html == "") html = readFile("web/login.html");

            if (html == "") send404(client);
            else sendResponse(client, html, "text/html");
        }


        // =================================================
        // SIGNUP PAGE
        // =================================================

        else if (
            request.find(
                "GET /signup.html"
            ) == 0
        )
        {
            string html = readFile("../web/signup.html");
            if (html == "") html = readFile("web/signup.html");

            if (html == "") send404(client);
            else sendResponse(client, html, "text/html");
        }


        // =================================================
        // DASHBOARD PAGE
        // =================================================

        else if (
            request.find(
                "GET /dashboard.html"
            ) == 0
        )
        {
            string html = readFile("../web/dashboard.html");
            if (html == "") html = readFile("web/dashboard.html");

            if (html == "") send404(client);
            else sendResponse(client, html, "text/html");
        }


        // =================================================
        // CART PAGE
        // =================================================

        else if (
            request.find(
                "GET /cart.html"
            ) == 0
        )
        {
            string html = readFile("../web/cart.html");
            if (html == "") html = readFile("web/cart.html");

            if (html == "") send404(client);
            else sendResponse(client, html, "text/html");
        }


        // =================================================
        // GOAL PAGE
        // =================================================

        else if (
            request.find(
                "GET /goal.html"
            ) == 0
        )
        {
            string html = readFile("../web/goal.html");
            if (html == "") html = readFile("web/goal.html");

            if (html == "") send404(client);
            else sendResponse(client, html, "text/html");
        }


        // =================================================
        // CSS
        // =================================================

        else if (
            request.find(
                "GET /style.css"
            ) == 0
        )
        {
            string css =
                readFile(
                    "../web/style.css"
                );


            if (css == "")
            {
                css =
                    readFile(
                        "web/style.css"
                    );
            }


            if (css == "")
            {
                send404(client);
            }
            else
            {
                sendResponse(
                    client,
                    css,
                    "text/css"
                );
            }
        }


        // =================================================
        // JAVASCRIPT
        // =================================================

        else if (
            request.find(
                "GET /script.js"
            ) == 0
        )
        {
            string js =
                readFile(
                    "../web/script.js"
                );


            if (js == "")
            {
                js =
                    readFile(
                        "web/script.js"
                    );
            }


            if (js == "")
            {
                send404(client);
            }
            else
            {
                sendResponse(
                    client,
                    js,
                    "application/javascript"
                );
            }
        }


        // =================================================
        // PWA ASSETS (installable Android home-screen app)
        // =================================================

        else if (request.find("GET /manifest.webmanifest") == 0)
        {
            string body = readFile("../web/manifest.webmanifest");
            if (body == "") body = readFile("web/manifest.webmanifest");
            if (body == "") send404(client);
            else sendResponse(client, body, "application/manifest+json");
        }
        else if (request.find("GET /service-worker.js") == 0)
        {
            string body = readFile("../web/service-worker.js");
            if (body == "") body = readFile("web/service-worker.js");
            if (body == "") send404(client);
            else sendResponse(client, body, "application/javascript");
        }
        else if (request.find("GET /icon-192.png") == 0)
        {
            string body = readFile("../web/icon-192.png");
            if (body == "") body = readFile("web/icon-192.png");
            if (body == "") send404(client);
            else sendResponse(client, body, "image/png");
        }
        else if (request.find("GET /icon-512.png") == 0)
        {
            string body = readFile("../web/icon-512.png");
            if (body == "") body = readFile("web/icon-512.png");
            if (body == "") send404(client);
            else sendResponse(client, body, "image/png");
        }

        // =================================================
        // 404
        // =================================================

        else
        {
            send404(client);
        }


        closesocket(client);
    }


public:

    // =================================================
    // CONSTRUCTOR
    // =================================================

    WebServer(
        vector<Product> &productList,
        HashTable &table,
        GroceryBasket &groceryBasket,
        OperationStack &stack,
        void (*undoCallback)()
    )
    {
        products =
            &productList;


        productTable =
            &table;


        basket =
            &groceryBasket;


        operationStack =
            &stack;


        undoFunction =
            undoCallback;


        serverSocket =
            INVALID_SOCKET;
    }


    // =================================================
    // START SERVER
    // =================================================

    void start()
    {
        WSADATA wsaData;


        if (
            WSAStartup(
                MAKEWORD(2, 2),
                &wsaData
            ) != 0
        )
        {
            cout
                << "WSAStartup failed!"
                << endl;

            return;
        }


        serverSocket =
            socket(
                AF_INET,
                SOCK_STREAM,
                0
            );


        if (
            serverSocket ==
            INVALID_SOCKET
        )
        {
            cout
                << "Socket creation failed!"
                << endl;

            WSACleanup();

            return;
        }


        sockaddr_in serverAddress;


        serverAddress.sin_family =
            AF_INET;


        serverAddress.sin_addr.s_addr =
            INADDR_ANY;


        serverAddress.sin_port =
            htons(8080);


        if (
            bind(
                serverSocket,
                (sockaddr*)&serverAddress,
                sizeof(serverAddress)
            ) == SOCKET_ERROR
        )
        {
            cout
                << "Bind failed!"
                << endl;


            closesocket(
                serverSocket
            );


            WSACleanup();

            return;
        }


        if (
            listen(
                serverSocket,
                10
            ) == SOCKET_ERROR
        )
        {
            cout
                << "Listen failed!"
                << endl;


            closesocket(
                serverSocket
            );


            WSACleanup();

            return;
        }


        cout
            << "\n========================================"
            << endl;


        cout
            << " NutriTrack Web Server Started"
            << endl;


        cout
            << " Open: http://localhost:8080"
            << endl;


        cout
            << "========================================"
            << endl;


        while (true)
        {
            sockaddr_in clientAddress;


            int clientLength =
                sizeof(clientAddress);


            SOCKET client =
                accept(
                    serverSocket,
                    (sockaddr*)&clientAddress,
                    &clientLength
                );


            if (
                client ==
                INVALID_SOCKET
            )
            {
                continue;
            }


            // Simple single-client handling.
            // No std::thread required.
            handleClient(
                client
            );
        }
    }
};

#endif