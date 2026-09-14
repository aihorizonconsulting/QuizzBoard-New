package com.iahorizonplus.quizzboardbackend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
@Slf4j
public class JwtUtils {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${app.jwt.refresh-expiration-ms}")
    private long jwtRefreshExpirationMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(this.jwtSecret);
        if (keyBytes.length < 32) {
            // Fallback si la clé n'est pas en base64 de 256 bits
            return Keys.hmacShaKeyFor(this.jwtSecret.getBytes());
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String email, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        return createToken(claims, email, jwtExpirationMs);
    }

    public String generateRefreshToken(String email) {
        return createToken(new HashMap<>(), email, jwtRefreshExpirationMs);
    }

    private String createToken(Map<String, Object> claims, String subject, long expirationMs) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    public String getEmailFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (MalformedJwtException e) {
            log.error("Token JWT invalide ou malformé : {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("Token JWT expiré : {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("Token JWT non supporté : {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("Claims JWT vides : {}", e.getMessage());
        } catch (Exception e) {
            log.error("Erreur de validation du token JWT : {}", e.getMessage());
        }
        return false;
    }
}
