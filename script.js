// Get elements from the page
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutine = document.getElementById("generateRoutine");
const clearProducts = document.getElementById("clearProducts");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Replace this with the Worker URL provided in your README
const workerUrl = "https://wanderbot.sultan-bakare.workers.dev/";

// Load previously selected products from localStorage
let selectedProducts =
  JSON.parse(localStorage.getItem("selectedProducts")) || [];

// This array stores the entire AI conversation
let messages = [
  {
    role: "system",
    content: `You are a helpful L'Oréal skincare and beauty advisor.
Help users create routines using the L'Oréal products they select.
You can answer questions about skincare, haircare, makeup, fragrance,
beauty routines, and the user's generated routine.
Keep your answers helpful, clear, and easy to understand.
Politely refuse questions that are unrelated to beauty, L'Oréal products,
or the user's routine.`
  }
];

// Initial product message
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products.
  </div>
`;

displaySelectedProducts();


// Load all products from products.json
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();

  return data.products;
}


// Display products on the page
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some(
        (item) => item.name === product.name
      );

      return `
        <div
          class="product-card ${isSelected ? "selected" : ""}"
          data-name="${product.name}"
        >
          <img src="${product.image}" alt="${product.name}">

          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>

            <button class="details-btn">
              View Details
            </button>

            <p class="product-description hidden">
              ${product.description}
            </p>
          </div>
        </div>
      `;
    })
    .join("");

  // Select or unselect a product when its card is clicked
  const productCards = document.querySelectorAll(".product-card");

  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      const productName = card.dataset.name;

      const product = products.find(
        (item) => item.name === productName
      );

      toggleProduct(product);
      displayProducts(products);
    });
  });

  // Show or hide a product description
  const detailButtons = document.querySelectorAll(".details-btn");

  detailButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      // Stops the product from being selected when clicking View Details
      e.stopPropagation();

      const description = button.nextElementSibling;

      description.classList.toggle("hidden");

      if (description.classList.contains("hidden")) {
        button.textContent = "View Details";
      } else {
        button.textContent = "Hide Details";
      }
    });
  });
}


// Add or remove a selected product
function toggleProduct(product) {
  const alreadySelected = selectedProducts.some(
    (item) => item.name === product.name
  );

  if (alreadySelected) {
    selectedProducts = selectedProducts.filter(
      (item) => item.name !== product.name
    );
  } else {
    selectedProducts.push(product);
  }

  saveSelectedProducts();
  displaySelectedProducts();
}


// Display the selected products
function displaySelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p>No products selected yet.</p>
    `;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product">
          <span>${product.name}</span>

          <button
            class="remove-product"
            data-name="${product.name}"
          >
            Remove
          </button>
        </div>
      `
    )
    .join("");

  // Remove products directly from the selected list
  const removeButtons = document.querySelectorAll(".remove-product");

  removeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const productName = button.dataset.name;

      selectedProducts = selectedProducts.filter(
        (product) => product.name !== productName
      );

      saveSelectedProducts();
      displaySelectedProducts();
    });
  });
}


// Save selected products in the browser
function saveSelectedProducts() {
  localStorage.setItem(
    "selectedProducts",
    JSON.stringify(selectedProducts)
  );
}


// Clear every selected product
clearProducts.addEventListener("click", () => {
  selectedProducts = [];

  saveSelectedProducts();
  displaySelectedProducts();

  productsContainer.innerHTML = `
    <div class="placeholder-message">
      Your selections have been cleared.
    </div>
  `;
});


// Filter products by category
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});


// Generate an AI routine
generateRoutine.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    addMessage(
      "ai",
      "Please select at least one product before generating a routine."
    );

    return;
  }

  chatWindow.innerHTML = "";

  // Only send the useful product information to the AI
  const productData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description
  }));

  const routineRequest = `
Build a personalized beauty routine using these selected products:

${JSON.stringify(productData)}

Explain the order they should be used in, when they should be used,
and what each product does in the routine.
`;

  // Add the routine request to conversation history
  messages.push({
    role: "user",
    content: routineRequest
  });

  addMessage("ai", "Building your routine...");

  try {
    const response = await fetch(workerUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        messages: messages
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    chatWindow.innerHTML = "";

    addMessage("ai", reply);

    // Save the AI answer so it remembers it later
    messages.push({
      role: "assistant",
      content: reply
    });
  } catch (error) {
    chatWindow.innerHTML = "";

    addMessage(
      "ai",
      "Something went wrong while generating your routine."
    );

    console.error(error);
  }
});


// Send follow up questions
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = userInput.value.trim();

  if (question === "") {
    return;
  }

  addMessage("user", question);

  // Add the new question to the conversation
  messages.push({
    role: "user",
    content: question
  });

  userInput.value = "";

  try {
    const response = await fetch(workerUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        messages: messages
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    addMessage("ai", reply);

    // Add the response to the conversation too
    messages.push({
      role: "assistant",
      content: reply
    });
  } catch (error) {
    addMessage(
      "ai",
      "Sorry, I could not get a response right now."
    );

    console.error(error);
  }
});


// Add a message bubble to the chat window
function addMessage(type, text) {
  const message = document.createElement("div");

  message.classList.add("message", type);
  message.textContent = text;

  chatWindow.appendChild(message);

  chatWindow.scrollTop = chatWindow.scrollHeight;
}