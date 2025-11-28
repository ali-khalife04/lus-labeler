import { useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { AlertCircle, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { API_BASE_URL } from "../api/config";

interface UserAccount {
  id: number | string;
  name: string;
}

interface LoginScreenProps {
  onLogin: (userName: string) => void;
  users: UserAccount[];
}

export function LoginScreen({ onLogin, users }: LoginScreenProps) {
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setLoginError("");

    if (!selectedDoctor || !password) {
      setLoginError("Please select a doctor and enter the password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: selectedDoctor,
          password,
        }),
      });

      if (!response.ok) {
        setLoginError("Invalid username or password.");
        return;
      }

      onLogin(selectedDoctor);
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-md px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-gray-800 mb-2">
            Surgical Video Annotation System
          </h1>
          <p className="text-gray-500">
            Laparoscopic Procedure Classification Interface
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="doctor-select" className="text-gray-700">
              Doctor Name
            </Label>
            <Select
              value={selectedDoctor}
              onValueChange={(value) => {
                setSelectedDoctor(value);
                setLoginError("");
              }}
            >
              <SelectTrigger id="doctor-select" className="bg-white">
                <SelectValue placeholder="Select a doctor..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.name}>
                    {user.name || "(no name)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setLoginError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !isSubmitting) {
                  handleLogin();
                }
              }}
              placeholder="Enter your password"
              className="bg-white"
            />
          </div>

          {loginError && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <Button
            type="button"
            onClick={handleLogin}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>
        </div>
      </div>
    </div>
  );
}

