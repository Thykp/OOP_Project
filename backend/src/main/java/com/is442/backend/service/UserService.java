package com.is442.backend.service;
import com.is442.backend.model.*;
import com.is442.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.UUID;



@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public <T extends User> T registerUser(T user) {  
         return userRepository.save(user);
    }
    
    public User findBySupabaseUserId(UUID supabaseUserId) {
        return userRepository.findBySupabaseUserId(supabaseUserId)
                .orElseThrow(() -> new RuntimeException("User not found with Supabase ID: " + supabaseUserId));
    } 

}
