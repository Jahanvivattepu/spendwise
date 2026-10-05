package com.spendwise.security;

import com.spendwise.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Reads "Authorization: Bearer <jwt>". If valid and the user still exists, the user id becomes
 * the authenticated principal. Otherwise the request stays unauthenticated (-> 401 later).
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository users;

    public JwtAuthFilter(JwtService jwtService, UserRepository users) {
        this.jwtService = jwtService;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            jwtService.parseUserId(header.substring(7))
                    .filter(users::existsById)
                    .ifPresent(userId -> SecurityContextHolder.getContext().setAuthentication(
                            new UsernamePasswordAuthenticationToken(userId, null, List.of())));
        }
        chain.doFilter(request, response);
    }
}
