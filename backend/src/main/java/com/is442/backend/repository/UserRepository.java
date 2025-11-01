package com.is442.backend.repository;
import com.is442.backend.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);
    // Find by Supabase Auth user ID (UUID string)
    Optional<User> findBySupabaseUserId(UUID supabaseUserId);
    
}
