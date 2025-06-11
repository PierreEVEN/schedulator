#!/bin/sh

VERSION=${1:-latest}

# Download and extract desired schedulator version
wget -O /opt/schedulator/schedulator.zip https://github.com/PierreEVEN/schedulator/releases/$VERSION/download/schedulator_linux_musl.zip  > /opt/schedulator/update.log 2>&1
unzip /opt/schedulator/schedulator.zip -d /opt

# Install
chmod u+x /opt/schedulator/schedulator

# Cleanup
rm /opt/schedulator/schedulator.zip

# Run
/opt/schedulator/schedulator