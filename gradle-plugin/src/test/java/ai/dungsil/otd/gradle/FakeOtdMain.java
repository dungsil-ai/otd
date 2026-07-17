package ai.dungsil.otd.gradle;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

public final class FakeOtdMain {
    private FakeOtdMain() {}

    public static void main(String[] args) throws Exception {
        if (Arrays.asList(args).contains("--no-output")) {
            return;
        }

        int outputOption = Arrays.asList(args).indexOf("--output");
        if (args.length < 4 || outputOption < 1 || outputOption + 1 >= args.length) {
            throw new IllegalArgumentException("Unexpected OTD arguments: " + Arrays.toString(args));
        }
        if (!Arrays.asList(args).contains("--force")) {
            throw new IllegalArgumentException("Missing --force: " + Arrays.toString(args));
        }

        Path input = Path.of(args[0]);
        Path output = Path.of(args[outputOption + 1]);
        Files.createDirectories(output.getParent());
        String document = "converted="
                + Files.readString(input, StandardCharsets.UTF_8)
                + System.lineSeparator()
                + "arguments="
                + String.join("|", args);
        Files.writeString(output, document, StandardCharsets.UTF_8);
    }
}
