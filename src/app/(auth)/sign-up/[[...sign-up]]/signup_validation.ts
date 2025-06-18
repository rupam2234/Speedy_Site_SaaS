export async function handleSignUpValidation(userData: {
  email: string;
  firstname: string;
  lastname: string;
  id: string;
}) {
  try {
    const response = await fetch("/api/users/signup-validation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const result = await response.json();

    if (response.ok && result.message === "User saved successfully") {
      console.log("User saved successfully");
    } else if (result.message === "User already exists") {
      console.log("User already exists");
    } else {
      console.error("Failed to save user data:", result.message);
    }
  } catch (error) {
    console.error("Error adding user data to db:", error);
  }
}
