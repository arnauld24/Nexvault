package Digital.Cloud.Wallet.Service.System.controllers;


import Digital.Cloud.Wallet.Service.System.WalletServiceSystemApplication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.Map;


@RestController
@RequestMapping("/api/internal/wallets")
//@crossOrigin(origins = "*")

public class WalletController {

    @Autowired
    private WalletServiceSystemApplication walletService;

    //Handles Deposit
    @PostMapping("/deposit")
    public ResponseEntity<?> deposit(@RequestBody Map<String, Object> req){
        return process(req, "credit", "deposit");
    }

    // Handles Withdrawals
    @PostMapping("/withdraw")
    public ResponseEntity<?> withdraw(@RequestBody Map<String, Object> req) {
        return process(req, "debit", "withdrawal");
    }

    // Handles Transfers
    @PostMapping("/transfer")
    public ResponseEntity<?> transfer(@RequestBody Map<String, Object> req) {
        UUID senderId = UUID.fromString(req.get("userId").toString());
        UUID recipientId = UUID.fromString(req.get("recipientId").toString());
        BigDecimal amount = new BigDecimal(req.get("amount").toString());

        walletService.executeTransfer(senderId, recipientId, amount);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private ResponseEntity<?> process(Map<String, Object> req, String type, String category) {
        UUID userId = UUID.fromString(req.get("userId").toString());
        BigDecimal amount = new BigDecimal(req.get("amount").toString());
        walletService.processTransaction(userId, amount, type, category);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/transaction")
    public  ResponseEntity<?> handleTransaction(@RequestBody Map<String, Object> payload){
        UUID userId = UUID.fromString(payload.get("user_id").toString());
        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
        String type = payload.get("type").toString();
        String category = payload.get("category").toString();

        walletService.processTransaction(userId, amount, type, category);

        return ResponseEntity.ok(Map.of("Status", "success", "message", "Transaction Processed"));
    }

}
