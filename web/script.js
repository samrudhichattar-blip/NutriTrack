let products = [];
let basket = [];


/* =========================================
   LOAD PRODUCTS FROM C++ SERVER
========================================= */

async function loadProducts()
{
    try
    {
        const response =
            await fetch("/api/products");

        if (!response.ok)
        {
            throw new Error("Could not load products");
        }

        products =
            await response.json();

        console.log(
            "Products loaded:",
            products.length
        );

        displayProducts(products);

        await loadBasket();
    }
    catch (error)
    {
        console.error(
            "Error loading products:",
            error
        );

        const productGrid =
            document.getElementById(
                "productGrid"
            );

        if (productGrid)
        {
            productGrid.innerHTML =
                `
                <div class="error-message">
                    <h3>Unable to load products</h3>
                    <p>
                        Make sure the C++ NutriTrack
                        server is running.
                    </p>
                </div>
                `;
        }
    }
}


/* =========================================
   LOAD BASKET FROM C++ SERVER
========================================= */

async function loadBasket()
{
    try
    {
        const response =
            await fetch(
                "/api/basket"
            );

        if (!response.ok)
        {
            throw new Error(
                "Could not load basket"
            );
        }

        const serverBasket =
            await response.json();

        basket = [];

        serverBasket.forEach(
            function(item)
            {
                const product =
                    products.find(
                        function(p)
                        {
                            return p.id === item.id;
                        }
                    );

                if (product)
                {
                    basket.push(
                        {
                            id: product.id,
                            name: product.name,
                            brand: product.brand,
                            quantity: item.quantity,
                            calories: product.calories,
                            protein: product.protein,
                            carbs: product.carbohydrates,
                            sugar: product.sugar,
                            fat: product.fat,
                            fiber: product.fiber,
                            sodium: product.sodium
                        }
                    );
                }
            }
        );

        updateBasket();
    }
    catch (error)
    {
        console.error(
            "Basket loading error:",
            error
        );
    }
}


/* =========================================
   DISPLAY PRODUCTS
========================================= */

function displayProducts(productList)
{
    const productGrid =
        document.getElementById(
            "productGrid"
        );

    if (!productGrid)
    {
        return;
    }

    productGrid.innerHTML = "";

    if (productList.length === 0)
    {
        productGrid.innerHTML =
            `
            <div class="empty-message">
                No products found.
            </div>
            `;

        return;
    }

    productList.forEach(
        function(product)
        {
            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "product-card";

            card.innerHTML =
                `
                <div class="product-category">
                    ${product.category}
                </div>

                <h3>
                    ${product.name}
                </h3>

                <p class="brand">
                    ${product.brand || "Generic"}
                </p>

                <div class="nutrition-info">

                    <div>
                        <span>Calories</span>

                        <strong>
                            ${Number(product.calories).toFixed(1)}
                        </strong>

                        <small>
                            kcal
                        </small>
                    </div>

                    <div>
                        <span>Protein</span>

                        <strong>
                            ${Number(product.protein).toFixed(1)}
                        </strong>

                        <small>
                            g
                        </small>
                    </div>

                    <div>
                        <span>Sugar</span>

                        <strong>
                            ${Number(product.sugar).toFixed(1)}
                        </strong>

                        <small>
                            g
                        </small>
                    </div>

                    <div>
                        <span>Fiber</span>

                        <strong>
                            ${Number(product.fiber).toFixed(1)}
                        </strong>

                        <small>
                            g
                        </small>
                    </div>

                </div>


                <button
                    class="add-button"
                    onclick="addToBasket('${product.id}')"
                >
                    Add to Basket
                </button>


                <div class="recommendation-controls">

                    <select
                        id="preference-${product.id}"
                    >
                        <option value="1">
                            Low Calories
                        </option>

                        <option value="2">
                            High Protein
                        </option>

                        <option value="3">
                            Low Sugar
                        </option>

                        <option value="4">
                            High Fiber
                        </option>

                        <option value="5">
                            Low Sodium
                        </option>
                    </select>


                    <button
                        class="recommendation-button"
                        onclick="loadRecommendations('${product.id}')"
                    >
                        Smart Alternatives
                    </button>

                </div>


                <div
                    id="recommendations-${product.id}"
                    class="recommendations-container"
                >
                </div>
                `;

            productGrid.appendChild(card);
        }
    );
}


/* =========================================
   ADD PRODUCT TO BASKET
   C++ LINKED LIST
========================================= */

async function addToBasket(productID)
{
    const product =
        products.find(
            function(p)
            {
                return p.id === productID;
            }
        );

    if (!product)
    {
        return;
    }

    try
    {
        const response =
            await fetch(
                "/api/basket/add?id=" +
                encodeURIComponent(
                    productID
                ),
                {
                    method: "POST"
                }
            );

        if (!response.ok)
        {
            throw new Error(
                "Could not add product"
            );
        }

        const data =
            await response.json();

        if (!data.success)
        {
            return;
        }

        await loadBasket();

        console.log(
            "Added:",
            product.name
        );
    }
    catch (error)
    {
        console.error(
            "Add to basket error:",
            error
        );
    }
}


/* =========================================
   REMOVE PRODUCT
   C++ LINKED LIST
========================================= */

async function removeFromBasket(
    productID
)
{
    try
    {
        const response =
            await fetch(
                "/api/basket/remove?id=" +
                encodeURIComponent(
                    productID
                ),
                {
                    method: "POST"
                }
            );

        if (!response.ok)
        {
            throw new Error(
                "Could not remove product"
            );
        }

        await loadBasket();
    }
    catch (error)
    {
        console.error(
            "Remove error:",
            error
        );
    }
}


/* =========================================
   INCREASE QUANTITY
========================================= */

async function increaseQuantity(
    productID
)
{
    try
    {
        const response =
            await fetch(
                "/api/basket/increase?id=" +
                encodeURIComponent(
                    productID
                ),
                {
                    method: "POST"
                }
            );

        if (!response.ok)
        {
            throw new Error(
                "Could not increase quantity"
            );
        }

        await loadBasket();
    }
    catch (error)
    {
        console.error(
            "Increase quantity error:",
            error
        );
    }
}


/* =========================================
   DECREASE QUANTITY
========================================= */

async function decreaseQuantity(
    productID
)
{
    try
    {
        const response =
            await fetch(
                "/api/basket/decrease?id=" +
                encodeURIComponent(
                    productID
                ),
                {
                    method: "POST"
                }
            );

        if (!response.ok)
        {
            throw new Error(
                "Could not decrease quantity"
            );
        }

        await loadBasket();
    }
    catch (error)
    {
        console.error(
            "Decrease quantity error:",
            error
        );
    }
}


/* =========================================
   UPDATE BASKET UI
========================================= */

function updateBasket()
{
    const basketContainer =
        document.getElementById(
            "basketItems"
        );

    const basketCount =
        document.getElementById(
            "basketCount"
        );


    if (basketCount)
    {
        basketCount.textContent =
            basket.length;
    }


    if (!basketContainer)
    {
        return;
    }


    basketContainer.innerHTML =
        "";


    if (basket.length === 0)
    {
        basketContainer.innerHTML =
            `
            <div class="empty-basket">

                <h3>
                    Your basket is empty
                </h3>

                <p>
                    Add products to start
                    building your grocery basket.
                </p>

            </div>
            `;

        updateNutrition();

        return;
    }


    basket.forEach(
        function(item)
        {
            const basketItem =
                document.createElement(
                    "div"
                );


            basketItem.className =
                "basket-item";


            basketItem.innerHTML =
                `
                <div class="basket-product-info">

                    <h3>
                        ${item.name}
                    </h3>

                    <p>
                        ${item.brand || "Generic"}
                    </p>

                    <p>
                        Quantity:
                        ${item.quantity} g
                    </p>

                </div>


                <div class="basket-actions">

                    <button
                        onclick="decreaseQuantity('${item.id}')"
                    >
                        −
                    </button>


                    <span>
                        ${item.quantity} g
                    </span>


                    <button
                        onclick="increaseQuantity('${item.id}')"
                    >
                        +
                    </button>


                    <button
                        class="remove-button"
                        onclick="removeFromBasket('${item.id}')"
                    >
                        Remove
                    </button>

                </div>
                `;


            basketContainer.appendChild(
                basketItem
            );
        }
    );


    updateNutrition();
}


/* =========================================
   GET NUTRITION FROM C++ SERVER
========================================= */

async function updateNutrition()
{
    try
    {
        const response =
            await fetch(
                "/api/nutrition"
            );

        if (!response.ok)
        {
            throw new Error(
                "Could not load nutrition"
            );
        }

        const total =
            await response.json();


        const calories =
            document.getElementById(
                "totalCalories"
            );

        const protein =
            document.getElementById(
                "totalProtein"
            );

        const carbs =
            document.getElementById(
                "totalCarbs"
            );

        const sugar =
            document.getElementById(
                "totalSugar"
            );

        const fat =
            document.getElementById(
                "totalFat"
            );

        const fiber =
            document.getElementById(
                "totalFiber"
            );

        const sodium =
            document.getElementById(
                "totalSodium"
            );


        if (calories)
        {
            calories.textContent =
                Number(
                    total.calories
                ).toFixed(1);
        }


        if (protein)
        {
            protein.textContent =
                Number(
                    total.protein
                ).toFixed(1);
        }


        if (carbs)
        {
            carbs.textContent =
                Number(
                    total.carbohydrates
                ).toFixed(1);
        }


        if (sugar)
        {
            sugar.textContent =
                Number(
                    total.sugar
                ).toFixed(1);
        }


        if (fat)
        {
            fat.textContent =
                Number(
                    total.fat
                ).toFixed(1);
        }


        if (fiber)
        {
            fiber.textContent =
                Number(
                    total.fiber
                ).toFixed(1);
        }


        if (sodium)
        {
            sodium.textContent =
                Number(
                    total.sodium
                ).toFixed(1);
        }
    }
    catch (error)
    {
        console.error(
            "Nutrition error:",
            error
        );
    }
}


/* =========================================
   HEAP RECOMMENDATIONS
========================================= */

async function loadRecommendations(
    productID
)
{
    const container =
        document.getElementById(
            "recommendations-" +
            productID
        );


    const selector =
        document.getElementById(
            "preference-" +
            productID
        );


    if (!container)
    {
        return;
    }


    let preference = 1;


    if (selector)
    {
        preference =
            selector.value;
    }


    container.innerHTML =
        `
        <p>
            Finding smart alternatives...
        </p>
        `;


    try
    {
        const response =
            await fetch(
                "/api/recommendations?id=" +
                encodeURIComponent(
                    productID
                ) +
                "&preference=" +
                preference
            );


        if (!response.ok)
        {
            throw new Error(
                "Could not load recommendations"
            );
        }


        const recommendations =
            await response.json();


        if (
            !recommendations ||
            recommendations.length === 0
        )
        {
            container.innerHTML =
                `
                <p>
                    No alternatives found.
                </p>
                `;

            return;
        }


        container.innerHTML =
            `
            <h4>
                Smart Alternatives
            </h4>
            `;


        recommendations.forEach(
            function(product)
            {
                const recommendation =
                    document.createElement(
                        "div"
                    );


                recommendation.className =
                    "recommendation-item";


                recommendation.innerHTML =
                    `
                    <strong>
                        ${product.name}
                    </strong>

                    <small>
                        ${product.brand || "Generic"}
                    </small>

                    <span>
                        ${Number(
                            product.calories
                        ).toFixed(1)}
                        kcal
                    </span>

                    <span>
                        Protein:
                        ${Number(
                            product.protein
                        ).toFixed(1)}
                        g
                    </span>

                    <button
                        onclick="addToBasket('${product.id}')"
                    >
                        Add
                    </button>
                    `;


                container.appendChild(
                    recommendation
                );
            }
        );
    }
    catch (error)
    {
        console.error(
            "Recommendation error:",
            error
        );


        container.innerHTML =
            `
            <p>
                Unable to load alternatives.
            </p>
            `;
    }
}


/* =========================================
   SEARCH PRODUCTS
   HASH TABLE
========================================= */

async function searchProducts()
{
    const searchInput =
        document.getElementById(
            "searchInput"
        );


    if (!searchInput)
    {
        return;
    }


    const searchText =
        searchInput.value.trim();


    if (searchText === "")
    {
        displayProducts(
            products
        );

        return;
    }


    try
    {
        const response =
            await fetch(
                "/api/search?id=" +
                encodeURIComponent(
                    searchText
                )
            );


        if (!response.ok)
        {
            throw new Error(
                "Search request failed"
            );
        }


        const data =
            await response.json();


        if (!data.found)
        {
            displayProducts(
                []
            );


            console.log(
                "Product not found."
            );


            return;
        }


        displayProducts(
            [
                data.product
            ]
        );
    }
    catch (error)
    {
        console.error(
            "Search error:",
            error
        );
    }
}


/* =========================================
   SEARCH WHEN ENTER IS PRESSED
========================================= */

function handleSearchKey(event)
{
    if (
        event.key === "Enter"
    )
    {
        searchProducts();
    }
}


/* =========================================
   CATEGORY FILTER
========================================= */

function filterCategory(
    category
)
{
    const filtered =
        products.filter(
            function(product)
            {
                return (
                    product.category ===
                    category
                );
            }
        );


    displayProducts(
        filtered
    );
}


/* =========================================
   SHOW ALL PRODUCTS
========================================= */

function showAllProducts()
{
    displayProducts(
        products
    );
}


/* =========================================
   CLEAR BASKET
========================================= */

async function clearBasket()
{
    if (basket.length === 0)
    {
        return;
    }


    const basketCopy =
        basket.slice();


    try
    {
        for (
            let i = 0;
            i < basketCopy.length;
            i++
        )
        {
            await fetch(
                "/api/basket/remove?id=" +
                encodeURIComponent(
                    basketCopy[i].id
                ),
                {
                    method: "POST"
                }
            );
        }


        await loadBasket();
    }
    catch (error)
    {
        console.error(
            "Clear basket error:",
            error
        );
    }
}


/* =========================================
   UNDO LAST OPERATION
========================================= */

async function undoLastOperation()
{
    try
    {
        const response =
            await fetch(
                "/api/undo",
                {
                    method: "POST"
                }
            );


        if (!response.ok)
        {
            throw new Error(
                "Undo request failed"
            );
        }


        const data =
            await response.json();


        if (data.success)
        {
            await loadBasket();
        }
        else
        {
            console.log(
                "Nothing to undo."
            );
        }
    }
    catch (error)
    {
        console.error(
            "Undo error:",
            error
        );
    }
}


/* =========================================
   SHOW BASKET
========================================= */

function showBasket()
{
    const basketSection =
        document.getElementById(
            "basket"
        );


    if (basketSection)
    {
        basketSection.scrollIntoView(
            {
                behavior: "smooth"
            }
        );
    }
}


/* =========================================
   SCROLL TO PRODUCTS
========================================= */

function scrollToProducts()
{
    const productsSection =
        document.getElementById(
            "products"
        );


    if (productsSection)
    {
        productsSection.scrollIntoView(
            {
                behavior: "smooth"
            }
        );
    }
}


/* =========================================
   INITIAL LOAD
========================================= */

loadProducts();