import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RegisterPage from "./page";
import { authApi } from "@/lib/apiClient";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/apiClient", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/apiClient")>("@/lib/apiClient");

  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      register: vi.fn(),
    },
  };
});

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to the registration success screen after a successful signup", async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      id: "user-1",
      email: "new@example.com",
      name: "NewUser",
      role: "USER",
      emailVerifiedAt: null,
    });

    render(<RegisterPage />);

    await act(async () => {
      fireEvent.change(
        screen.getByLabelText(/nombre con el que te verán los demás/i),
        {
          target: { value: "NewUser" },
        },
      );
      fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: "new@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^contraseña\s*$/i), {
        target: { value: "Password1!" },
      });
      fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
        target: { value: "Password1!" },
      });
      fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/register/success?email=new%40example.com",
      );
    });
  });

  it("shows only the password requirements that are still unmet", async () => {
    render(<RegisterPage />);

    expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText(/al menos una mayúscula/i)).toBeInTheDocument();
    expect(screen.getByText(/al menos una minúscula/i)).toBeInTheDocument();
    expect(screen.getByText(/al menos un número/i)).toBeInTheDocument();
    expect(
      screen.getByText(/al menos un carácter especial/i),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/^contraseña\s*$/i), {
        target: { value: "Password1!" },
      });
    });

    expect(
      screen.queryByText(/al menos 8 caracteres/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/al menos una mayúscula/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/al menos una minúscula/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/al menos un número/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/al menos un carácter especial/i),
    ).not.toBeInTheDocument();
  });

  it("accepts display names with spaces, periods, underscores, and hyphens", async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      id: "user-1",
      email: "new@example.com",
      name: "Laura Gomez",
      role: "USER",
      emailVerifiedAt: null,
    });

    const validNames = [
      "Laura Gomez",
      "froylan.vargas",
      "camilo_ramones",
      "ana-maria",
    ];

    for (const name of validNames) {
      render(<RegisterPage />);

      await act(async () => {
        fireEvent.change(
          screen.getByLabelText(/nombre con el que te verán los demás/i),
          { target: { value: name } },
        );
        fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
          target: { value: "new@example.com" },
        });
        fireEvent.change(screen.getByLabelText(/^contraseña\s*$/i), {
          target: { value: "Password1!" },
        });
        fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
          target: { value: "Password1!" },
        });
        fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
      });

      await waitFor(() => {
        expect(authApi.register).toHaveBeenCalledWith({
          name,
          email: "new@example.com",
          password: "Password1!",
        });
      });

      cleanup();
      vi.clearAllMocks();
    }
  });

  it("shows an error when the display name contains unsupported characters", async () => {
    render(<RegisterPage />);

    await act(async () => {
      fireEvent.change(
        screen.getByLabelText(/nombre con el que te verán los demás/i),
        {
          target: { value: "camilo@ramones" },
        },
      );
      fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: "new@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^contraseña\s*$/i), {
        target: { value: "Password1!" },
      });
      fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
        target: { value: "Password1!" },
      });
      fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    });

    expect(
      screen.getByText(
        /El nombre con el que te verán solo puede contener letras, números, espacios, puntos, guiones y guion bajo/i,
      ),
    ).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });
});
